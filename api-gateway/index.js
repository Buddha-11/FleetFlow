const express = require('express');
const http = require('http');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { default: RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { Kafka } = require('kafkajs');

const app = express();
const server = http.createServer(app);
app.use(express.json());

// ─── Redis Setup ──────────────────────────────────────────────────────────────
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisClient = new Redis({ host: REDIS_HOST, port: REDIS_PORT, lazyConnect: true });
redisClient.on('error', (err) => console.warn('[Redis] Connection error:', err.message));
redisClient.connect().catch(() => console.warn('[Redis] Could not connect on startup, will retry...'));

// ─── Rate Limiter (memory fallback, Redis optional) ───────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  // No Redis store — use in-memory for reliability. Redis store can be added after stable.
});
app.use(apiLimiter);

const SECRET = "mysecretkey";

// ─── Socket.io & Redis Adapter ────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*' }
});
const pubClient = new Redis({ host: REDIS_HOST, port: REDIS_PORT, lazyConnect: true });
const subClient = new Redis({ host: REDIS_HOST, port: REDIS_PORT, lazyConnect: true });
pubClient.on('error', (err) => console.warn('[Redis pub] error:', err.message));
subClient.on('error', (err) => console.warn('[Redis sub] error:', err.message));

// Connect pub/sub clients for Socket.io adapter, non-blocking
Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[Redis] Socket.io adapter connected.');
  })
  .catch((err) => console.warn('[Redis] Socket.io adapter failed, running without it:', err.message));

// Simple socket authentication and room joining
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return next(new Error("Authentication error"));
    socket.user = user;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`[Socket] User ${socket.user.id} connected on pod ${process.env.HOSTNAME}`);
  // Join a room named after their userId to receive personal updates
  socket.join(`user_${socket.user.id}`);
});

// ─── Kafka Setup (Consuming Order Events) ─────────────────────────────────────
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';
const kafka = new Kafka({
  clientId: 'api-gateway',
  brokers: [KAFKA_BROKER],
});
// Generate a unique group ID for each API Gateway instance so they all receive the message.
// Actually, since we use Redis adapter, only ONE gateway needs to process the Kafka message
// and `io.to().emit()` will broadcast it to the right pod via Redis. 
// So we use a shared group ID so only one pod processes the event!
const consumer = kafka.consumer({ groupId: 'api-gateway-group' });

async function initKafka() {
  const retry = async (attempt = 1) => {
    try {
      await consumer.connect();
      await consumer.subscribe({ topic: 'OrderDelivered', fromBeginning: false });
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const data = JSON.parse(message.value.toString());
          console.log(`[Kafka] Order #${data.orderId} Delivered. Emitting to user_${data.userId}...`);
          io.to(`user_${data.userId}`).emit('order-delivered', data);
        },
      });
      console.log('[Kafka] Consumer connected successfully.');
    } catch (err) {
      console.warn(`[Kafka] Connection attempt ${attempt} failed: ${err.message}. Retrying in 5s...`);
      setTimeout(() => retry(attempt + 1), 5000);
    }
  };
  retry();
}
initKafka();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Handled by pod: ${process.env.HOSTNAME || 'unknown'} | ${req.method} ${req.url}`);
  next();
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

function authorizeRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: "Forbidden: insufficient permissions" });
    }
    next();
  };
}

// ─── API Gateway Routes ───────────────────────────────────────────────────────
app.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (role !== 'ADMIN' && role !== 'USER') {
      return res.status(400).json({ error: "Invalid role. Must be ADMIN or USER" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const response = await axios.post('http://user-service:3001/users', {
      name, email, password: hashedPassword, role
    });
    res.status(201).json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: "Error registering", details: err.response?.data || err.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const response = await axios.get(`http://user-service:3001/users/email/${email}`);
    const user = response.data;
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: "Invalid password" });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: '1h' });
    res.json({ token, role: user.role });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: "Error logging in", details: err.response?.data || err.message });
  }
});

app.post('/admin/product', authenticateToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const response = await axios.post('http://product-service:3002/products', req.body);
    res.status(201).json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: "Error adding product", details: err.response?.data || err.message });
  }
});

app.get('/products', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get('http://product-service:3002/products');
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: "Error fetching products", details: err.response?.data || err.message });
  }
});

app.post('/order', authenticateToken, async (req, res) => {
  try {
    req.body.userId = req.user.id;
    const response = await axios.post('http://order-service:3003/order', req.body);
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: 'Error placing order', details: err.response?.data || err.message });
  }
});

app.get('/order/:id/status', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`http://order-service:3003/order/${req.params.id}/status`);
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: 'Error fetching status', details: err.response?.data || err.message });
  }
});

app.post('/location/update', async (req, res) => {
  try {
    const response = await axios.post('http://location-service:4000/update-location', req.body);
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: 'Error forwarding location', details: err.response?.data || err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway', pod: process.env.HOSTNAME }));

app.get('/stress', (req, res) => {
  const start = Date.now();
  while (Date.now() - start < 50) { Math.sqrt(Math.random() * Math.random()); }
  res.json({ message: "Stress test successful", pod: process.env.HOSTNAME });
});

server.listen(3000, () => console.log("API Gateway running on 3000"));