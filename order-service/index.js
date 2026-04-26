const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

const userProto = grpc.loadPackageDefinition(
  protoLoader.loadSync('./proto/user.proto')
);

const productProto = grpc.loadPackageDefinition(
  protoLoader.loadSync('./proto/product.proto')
);

const userClient = new userProto.UserService(
  'user-service:50051',
  grpc.credentials.createInsecure()
);

const productClient = new productProto.ProductService(
  'product-service:50052',
  grpc.credentials.createInsecure()
);

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

app.post('/order', async (req, res) => {
  const { userId, productId } = req.body;

  userClient.GetUser({ id: userId.toString() }, (err, user) => {
    if (err) return res.status(500).json({ error: "User not found or error", details: err });

    productClient.GetProduct({ id: productId.toString() }, async (err, product) => {
      if (err) return res.status(500).json({ error: "Product not found or error", details: err });

      try {
        const [result] = await pool.query(
          'INSERT INTO Orders (user_id, product_id) VALUES (?, ?)',
          [userId, productId]
        );
        res.json({
          message: "Order placed successfully",
          orderId: result.insertId,
          user,
          product
        });
      } catch (dbErr) {
        res.status(500).json({ error: "Error saving order", details: dbErr.message });
      }
    });
  });
});

async function start() {
  await initDB();
  app.listen(3003, () => console.log("Order service running on 3003"));
}

start();