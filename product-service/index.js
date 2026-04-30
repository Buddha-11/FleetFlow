const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const express = require('express');
const mysql = require('mysql2/promise');

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

// ─── gRPC: GetProduct ─────────────────────────────────────────────────────────
async function GetProduct(call, callback) {
  try {
    const [rows] = await pool.query('SELECT * FROM Products WHERE id = ?', [call.request.id]);
    if (rows.length > 0) {
      const p = rows[0];
      callback(null, {
        id: p.id.toString(),
        name: p.name,
        price: parseFloat(p.price),
        description: p.description || '',
        stock: p.stock
      });
    } else {
      callback({ code: grpc.status.NOT_FOUND, details: 'Product not found' });
    }
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, details: err.message });
  }
}

// ─── gRPC: DeductStock ────────────────────────────────────────────────────────
async function DeductStock(call, callback) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT stock FROM Products WHERE id = ? FOR UPDATE',
      [call.request.id]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return callback(null, { success: false, message: 'Product not found' });
    }

    if (rows[0].stock <= 0) {
      await conn.rollback();
      return callback(null, { success: false, message: 'Out of stock' });
    }

    await conn.query(
      'UPDATE Products SET stock = stock - 1 WHERE id = ?',
      [call.request.id]
    );
    await conn.commit();
    callback(null, { success: true, message: 'Stock deducted' });
  } catch (err) {
    await conn.rollback();
    callback({ code: grpc.status.INTERNAL, details: err.message });
  } finally {
    conn.release();
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
    res.status(201).json({ id: result.insertId, name, price, description, stock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── REST: Get All Products ───────────────────────────────────────────────────
app.get('/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Products');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'product-service' }));

// Start services
async function start() {
  await initDB();

  app.listen(3002, () => console.log('Product service REST running on 3002'));

  const server = new grpc.Server();
  server.addService(grpcObject.ProductService.service, { GetProduct, DeductStock });
  server.bindAsync('0.0.0.0:50052', grpc.ServerCredentials.createInsecure(), () => {
    console.log('Product service gRPC running on 50052');
  });
}

start();
