const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mysql = require('mysql2/promise');
const axios = require('axios');

const app = express();
app.use(express.json());

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

// Promisify gRPC calls
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

function grpcDeductStock(id) {
  return new Promise((resolve, reject) => {
    productClient.DeductStock({ id: id.toString() }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// Haversine distance in meters
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

const DELIVERY_THRESHOLD_METERS = 50;

// ─── POST /order ──────────────────────────────────────────────────────────────
app.post('/order', async (req, res) => {
  const { userId, productId, deliveryLocation } = req.body;

  if (!deliveryLocation || deliveryLocation.lat === undefined || deliveryLocation.lng === undefined) {
    return res.status(400).json({ error: 'deliveryLocation with lat and lng is required' });
  }

  try {
    // 1. Validate user via gRPC
    const user = await grpcGetUser(userId).catch(() => null);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 2. Validate product via gRPC
    const product = await grpcGetProduct(productId).catch(() => null);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // 3. Check stock
    if (product.stock <= 0) {
      return res.status(400).json({ error: 'Product is out of stock' });
    }

    // 4. Deduct stock atomically via gRPC
    const deductResult = await grpcDeductStock(productId);
    if (!deductResult.success) {
      return res.status(400).json({ error: deductResult.message });
    }

    // 5. Assign driver (static for now)
    const assignedDriver = 'driver1';

    // 6. Insert order
    const [result] = await pool.query(
      `INSERT INTO Orders (user_id, product_id, delivery_lat, delivery_lng, driver_id, status)
       VALUES (?, ?, ?, ?, ?, 'ASSIGNED')`,
      [userId, productId, deliveryLocation.lat, deliveryLocation.lng, assignedDriver]
    );

    console.log(`[Order] #${result.insertId} placed → assigned to ${assignedDriver}`);

    res.json({
      message: 'Order placed successfully',
      orderId: result.insertId,
      status: 'ASSIGNED',
      driverId: assignedDriver,
      user: { id: user.id, name: user.name, email: user.email },
      product: { id: product.id, name: product.name, price: product.price },
      deliveryLocation
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
    // 1. Fetch order from DB
    const [rows] = await pool.query('SELECT * FROM Orders WHERE id = ?', [orderId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = rows[0];

    // 2. Fetch driver's current location from Location Service
    let driverLocation = null;
    let currentStatus = order.status;

    try {
      const locRes = await axios.get(
        `http://location-service:4000/driver-location/${order.driver_id}`
      );
      driverLocation = locRes.data.location;
    } catch (locErr) {
      console.warn(`[Order] Could not fetch driver location: ${locErr.message}`);
    }

    // 3. Auto-complete delivery if driver is within threshold
    if (
      driverLocation &&
      currentStatus !== 'DELIVERED' &&
      currentStatus !== 'PLACED'
    ) {
      const dist = haversineMeters(
        driverLocation.lat,
        driverLocation.lng,
        order.delivery_lat,
        order.delivery_lng
      );

      console.log(`[Order] #${orderId} — driver ${dist.toFixed(1)}m from delivery point`);

      if (dist < DELIVERY_THRESHOLD_METERS) {
        await pool.query("UPDATE Orders SET status = 'DELIVERED' WHERE id = ?", [orderId]);
        currentStatus = 'DELIVERED';
        console.log(`[Order] #${orderId} → DELIVERED`);
      } else if (currentStatus === 'ASSIGNED') {
        // Driver is moving, mark as IN_TRANSIT
        await pool.query("UPDATE Orders SET status = 'IN_TRANSIT' WHERE id = ?", [orderId]);
        currentStatus = 'IN_TRANSIT';
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
async function start() {
  await initDB();
  app.listen(3003, () => console.log('Order service running on 3003'));
}

start();