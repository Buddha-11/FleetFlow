const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const express = require('express');
const mysql = require('mysql2/promise');
const { Kafka } = require('kafkajs');
const Redis = require('ioredis');

const packageDef = protoLoader.loadSync('./proto/product.proto');
const grpcObject = grpc.loadPackageDefinition(packageDef);

const app = express();
app.use(express.json());

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

// ─── Redis Setup ──────────────────────────────────────────────────────────────
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

// ─── Kafka Setup ──────────────────────────────────────────────────────────────
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';
const kafka = new Kafka({
  clientId: 'product-service',
  brokers: [KAFKA_BROKER],
});
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'product-group' });


// ─── gRPC: GetProduct ─────────────────────────────────────────────────────────
async function GetProduct(call, callback) {
  const productId = call.request.id;
  try {
    // 1. Check Cache
    const cachedProduct = await redis.get(`product:${productId}`);
    if (cachedProduct) {
      console.log(`[Cache Hit] Product #${productId}`);
      return callback(null, JSON.parse(cachedProduct));
    }

    // 2. Fetch from DB
    console.log(`[Cache Miss] Product #${productId}`);
    const [rows] = await pool.query('SELECT * FROM Products WHERE id = ?', [productId]);
    if (rows.length > 0) {
      const p = rows[0];
      const productObj = {
        id: p.id.toString(),
        name: p.name,
        price: parseFloat(p.price),
        description: p.description || '',
        stock: p.stock
      };
      // 3. Set Cache
      await redis.set(`product:${productId}`, JSON.stringify(productObj), 'EX', 3600); // 1 hour
      callback(null, productObj);
    } else {
      callback({ code: grpc.status.NOT_FOUND, details: 'Product not found' });
    }
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, details: err.message });
  }
}

// ─── REST: Create Product (Admin) ─────────────────────────────────────────────
app.post('/products', async (req, res) => {
  const { name, price, description, stock } = req.body;
  if (stock === undefined || stock < 0) {
    return res.status(400).json({ error: 'stock is required and must be >= 0' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO Products (name, price, description, stock) VALUES (?, ?, ?, ?)',
      [name, price, description, stock]
    );
    // Invalidate products list cache
    await redis.del('products:all');
    res.status(201).json({ id: result.insertId, name, price, description, stock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── REST: Get All Products ───────────────────────────────────────────────────
app.get('/products', async (req, res) => {
  try {
    const cachedProducts = await redis.get('products:all');
    if (cachedProducts) {
      return res.json(JSON.parse(cachedProducts));
    }

    const [rows] = await pool.query('SELECT * FROM Products');
    await redis.set('products:all', JSON.stringify(rows), 'EX', 3600);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'product-service' }));

async function connectKafka(attempt = 1) {
  try {
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: 'OrderPaid', fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (topic === 'OrderPaid') {
          const data = JSON.parse(message.value.toString());
          const { orderId, productId } = data;
          
          console.log(`[Kafka] Received OrderPaid for order #${orderId}, deducting stock for product #${productId}`);
          
          const conn = await pool.getConnection();
          try {
            await conn.beginTransaction();

            const [rows] = await conn.query(
              'SELECT stock FROM Products WHERE id = ? FOR UPDATE',
              [productId]
            );

            if (rows.length === 0 || rows[0].stock <= 0) {
              await conn.rollback();
              console.log(`[Kafka] Stock failed for order #${orderId}`);
              await producer.send({
                topic: 'StockFailed',
                messages: [{ value: JSON.stringify({ orderId, reason: 'Out of stock or missing' }) }],
              });
            } else {
              await conn.query(
                'UPDATE Products SET stock = stock - 1 WHERE id = ?',
                [productId]
              );
              await conn.commit();
              
              await redis.del(`product:${productId}`);
              await redis.del('products:all');

              console.log(`[Kafka] Stock deducted for order #${orderId}`);
              await producer.send({
                topic: 'StockDeducted',
                messages: [{ value: JSON.stringify({ orderId }) }],
              });
            }
          } catch (err) {
            await conn.rollback();
            console.error(`[Kafka] Error deducting stock for order #${orderId}:`, err);
            await producer.send({
              topic: 'StockFailed',
              messages: [{ value: JSON.stringify({ orderId, reason: err.message }) }],
            });
          } finally {
            conn.release();
          }
        }
      },
    });
    console.log('[Kafka] Product service consumers connected.');
  } catch (err) {
    console.warn(`[Kafka] Connection attempt ${attempt} failed: ${err.message}. Retrying in 5s...`);
    setTimeout(() => connectKafka(attempt + 1), 5000);
  }
}

async function start() {
  await initDB();
  app.listen(3002, () => console.log('Product service REST running on 3002'));

  const server = new grpc.Server();
  server.addService(grpcObject.ProductService.service, { GetProduct });
  server.bindAsync('0.0.0.0:50052', grpc.ServerCredentials.createInsecure(), () => {
    console.log('Product service gRPC running on 50052');
  });

  connectKafka();
}

start().catch(console.error);
start().catch(console.error);
