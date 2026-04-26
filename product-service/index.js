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

// gRPC GetProduct
async function GetProduct(call, callback) {
  try {
    const [rows] = await pool.query('SELECT * FROM Products WHERE id = ?', [call.request.id]);
    if (rows.length > 0) {
      const product = rows[0];
      callback(null, {
        id: product.id.toString(),
        name: product.name,
        price: parseFloat(product.price),
        description: product.description || ''
      });
    } else {
      callback({
        code: grpc.status.NOT_FOUND,
        details: "Product not found"
      });
    }
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      details: err.message
    });
  }
}

// REST Endpoints
app.post('/products', async (req, res) => {
  const { name, price, description } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO Products (name, price, description) VALUES (?, ?, ?)',
      [name, price, description]
    );
    res.status(201).json({ id: result.insertId, name, price, description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Products');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start services
async function start() {
  await initDB();
  
  // REST Server
  app.listen(3002, () => {
    console.log("Product service REST running on 3002");
  });

  // gRPC Server
  const server = new grpc.Server();
  server.addService(grpcObject.ProductService.service, { GetProduct });
  server.bindAsync("0.0.0.0:50052", grpc.ServerCredentials.createInsecure(), () => {
    console.log("Product service gRPC running on 50052");
  });
}

start();
