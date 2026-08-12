const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mysql = require('mysql2/promise');
const axios = require('axios');
const { Kafka } = require('kafkajs');
const CircuitBreaker = require('opossum');

const app = express();
app.use(express.json());

// ─── Kafka Setup ──────────────────────────────────────────────────────────────
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';
const kafka = new Kafka({
  clientId: 'order-service',
  brokers: [KAFKA_BROKER],
});
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'order-group' });

// ─── gRPC Clients ─────────────────────────────────────────────────────────────
const userProto = grpc.loadPackageDefinition(protoLoader.loadSync('./proto/user.proto'));
const productProto = grpc.loadPackageDefinition(protoLoader.loadSync('./proto/product.proto'));

const userClient = new userProto.UserService(
  'user-service:50051',
  grpc.credentials.createInsecure()
);

const productClient = new productProto.ProductService(
  'product-service:50052',
  grpc.credentials.createInsecure()
);

// ─── DB ───────────────────────────────────────────────────────────────────────
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'ecommerce'
};

let pool;
async function initDB() {
  pool = mysql.createPool(dbConfig);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function grpcGetUser(id) {
  return new Promise((resolve, reject) => {
    userClient.GetUser({ id: id.toString() }, (err, user) => {
      if (err) reject(err);
      else resolve(user);
    });
  });
}

function grpcGetProduct(id) {
  return new Promise((resolve, reject) => {
    productClient.GetProduct({ id: id.toString() }, (err, product) => {
      if (err) reject(err);
      else resolve(product);
    });
  });
}

// ─── Circuit Breakers ─────────────────────────────────────────────────────────
const cbOptions = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000
};

const userBreaker = new CircuitBreaker(grpcGetUser, cbOptions);
const productBreaker = new CircuitBreaker(grpcGetProduct, cbOptions);

userBreaker.fallback(() => ({ error: 'User Service Unavailable' }));
productBreaker.fallback(() => ({ error: 'Product Service Unavailable' }));

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DELIVERY_THRESHOLD_METERS = 200;

// ─── POST /order ──────────────────────────────────────────────────────────────
app.post('/order', async (req, res) => {
  const { userId, productId, deliveryLocation } = req.body;

  if (!deliveryLocation || deliveryLocation.lat === undefined || deliveryLocation.lng === undefined) {
    return res.status(400).json({ error: 'deliveryLocation with lat and lng is required' });
  }

  try {
    // 1. Validate user via gRPC
    const user = await userBreaker.fire(userId).catch(() => null);
    if (!user || user.error) return res.status(503).json({ error: user ? user.error : 'User not found' });

    // 2. Validate product via gRPC
    const product = await productBreaker.fire(productId).catch(() => null);
    if (!product || product.error) return res.status(503).json({ error: product ? product.error : 'Product not found' });

    // 3. Check stock (optimistic)
    if (product.stock <= 0) {
      return res.status(400).json({ error: 'Product is out of stock' });
    }

    // 4. Insert order as PENDING
    const [result] = await pool.query(
      `INSERT INTO Orders (user_id, product_id, delivery_lat, delivery_lng, status)
       VALUES (?, ?, ?, ?, 'PENDING')`,
      [userId, productId, deliveryLocation.lat, deliveryLocation.lng]
    );
    const orderId = result.insertId;

    // 5. Emit OrderCreated Event (Saga Pattern Start)
    await producer.send({
      topic: 'OrderCreated',
      messages: [{ value: JSON.stringify({ id: orderId, userId, productId, price: product.price }) }],
    });

    console.log(`[Order] #${orderId} placed (PENDING) → Event emitted`);

    res.json({
      message: 'Order received and is processing',
      orderId: orderId,
      status: 'PENDING'
    });
  } catch (err) {
    console.error('[Order] Error:', err);
    res.status(500).json({ error: 'Error placing order', details: err.message });
  }
});

// ─── GET /order/:id/status ────────────────────────────────────────────────────
app.get('/order/:id/status', async (req, res) => {
  const orderId = req.params.id;

  try {
    const [rows] = await pool.query('SELECT * FROM Orders WHERE id = ?', [orderId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = rows[0];
    let driverLocation = null;
    let currentStatus = order.status;

    if (order.driver_id && currentStatus !== 'DELIVERED' && currentStatus !== 'PENDING' && currentStatus !== 'PAID') {
      try {
        const locRes = await axios.get(
          `http://location-service:4000/driver-location/${order.driver_id}`
        );
        driverLocation = locRes.data.location;
      } catch (locErr) {
        console.warn(`[Order] Could not fetch driver location: ${locErr.message}`);
      }

      if (driverLocation) {
        const dist = haversineMeters(
          driverLocation.lat,
          driverLocation.lng,
          order.delivery_lat,
          order.delivery_lng
        );

        if (dist < DELIVERY_THRESHOLD_METERS) {
          await pool.query("UPDATE Orders SET status = 'DELIVERED' WHERE id = ?", [orderId]);
          currentStatus = 'DELIVERED';
          console.log(`[Order] #${orderId} → DELIVERED`);
          
          await producer.send({
            topic: 'OrderDelivered',
            messages: [{ value: JSON.stringify({ orderId, userId: order.user_id, status: 'DELIVERED' }) }],
          });
        } else if (currentStatus === 'ASSIGNED') {
          await pool.query("UPDATE Orders SET status = 'IN_TRANSIT' WHERE id = ?", [orderId]);
          currentStatus = 'IN_TRANSIT';
        }
      }
    }

    res.json({
      orderId: parseInt(orderId),
      status: currentStatus,
      driverId: order.driver_id,
      driverLocation,
      deliveryLocation: {
        lat: order.delivery_lat,
        lng: order.delivery_lng
      }
    });
  } catch (err) {
    console.error('[Order] Status error:', err);
    res.status(500).json({ error: 'Error fetching order status', details: err.message });
  }
});

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'order-service' }));

// ─── Start ────────────────────────────────────────────────────────────────────
async function connectKafka(attempt = 1) {
  try {
    await producer.connect();
    await consumer.connect();

    await consumer.subscribe({ topic: 'PaymentProcessed', fromBeginning: true });
    await consumer.subscribe({ topic: 'PaymentFailed', fromBeginning: true });
    await consumer.subscribe({ topic: 'StockDeducted', fromBeginning: true });
    await consumer.subscribe({ topic: 'StockFailed', fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const data = JSON.parse(message.value.toString());
        
        if (topic === 'PaymentProcessed') {
          console.log(`[Kafka] Order #${data.orderId} Paid`);
          await pool.query("UPDATE Orders SET status = 'PAID' WHERE id = ?", [data.orderId]);
          const [rows] = await pool.query('SELECT product_id FROM Orders WHERE id = ?', [data.orderId]);
          if(rows.length > 0) {
            await producer.send({
              topic: 'OrderPaid',
              messages: [{ value: JSON.stringify({ orderId: data.orderId, productId: rows[0].product_id }) }],
            });
          }
        } 
        else if (topic === 'PaymentFailed') {
          console.log(`[Kafka] Order #${data.orderId} Payment Failed: ${data.reason}`);
          await pool.query("UPDATE Orders SET status = 'CANCELLED' WHERE id = ?", [data.orderId]);
        }
        else if (topic === 'StockDeducted') {
          console.log(`[Kafka] Order #${data.orderId} Stock Deducted -> ASSIGNED to driver1`);
          await pool.query("UPDATE Orders SET status = 'ASSIGNED', driver_id = 'driver1' WHERE id = ?", [data.orderId]);
        }
        else if (topic === 'StockFailed') {
          console.log(`[Kafka] Order #${data.orderId} Stock Failed -> CANCELLED, initiating refund`);
          await pool.query("UPDATE Orders SET status = 'CANCELLED' WHERE id = ?", [data.orderId]);
          await producer.send({
            topic: 'RefundPayment',
            messages: [{ value: JSON.stringify({ orderId: data.orderId }) }],
          });
        }
      },
    });
    console.log('[Kafka] Order service consumers connected.');
  } catch (err) {
    console.warn(`[Kafka] Connection attempt ${attempt} failed: ${err.message}. Retrying in 5s...`);
    setTimeout(() => connectKafka(attempt + 1), 5000);
  }
}

async function start() {
  await initDB();
  app.listen(3003, () => console.log('Order service running on 3003'));
  connectKafka();
}

start().catch(console.error);