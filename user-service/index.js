const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const express = require('express');
const mysql = require('mysql2/promise');

const packageDef = protoLoader.loadSync('./proto/user.proto');
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

// gRPC GetUser
async function GetUser(call, callback) {
  try {
    const [rows] = await pool.query('SELECT * FROM Users WHERE id = ?', [call.request.id]);
    if (rows.length > 0) {
      const user = rows[0];
      callback(null, {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      });
    } else {
      callback({
        code: grpc.status.NOT_FOUND,
        details: "User not found"
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
app.post('/users', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO Users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, password, role]
    );
    res.status(201).json({ id: result.insertId, name, email, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/users/email/:email', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Users WHERE email = ?', [req.params.email]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'user-service' }));

// Start services
async function start() {
  await initDB();
  
  // REST Server
  app.listen(3001, () => {
    console.log("User service REST running on 3001");
  });

  // gRPC Server
  const server = new grpc.Server();
  server.addService(grpcObject.UserService.service, { GetUser });
  server.bindAsync("0.0.0.0:50051", grpc.ServerCredentials.createInsecure(), () => {
    console.log("User service gRPC running on 50051");
  });
}

start();