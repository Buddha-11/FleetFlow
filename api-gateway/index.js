const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());

const SECRET = "mysecretkey";

// API Gateway routes

app.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Validate role
    if (role !== 'ADMIN' && role !== 'USER') {
      return res.status(400).json({ error: "Invalid role. Must be ADMIN or USER" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Call User Service to save
    const response = await axios.post('http://user-service:3001/users', {
      name,
      email,
      password: hashedPassword,
      role
    });

    res.status(201).json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: "Error registering user", details: err.response?.data || err.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Fetch user from User Service
    const response = await axios.get(`http://user-service:3001/users/email/${email}`);
    const user = response.data;

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: '1h' });

    res.json({ token, role: user.role });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: "Error logging in", details: err.response?.data || err.message });
  }
});

// Middlewares
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

// Protected Routes
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
    // Inject userId from JWT — user cannot spoof their own ID
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
    res.status(err.response?.status || 500).json({ error: 'Error fetching order status', details: err.response?.data || err.message });
  }
});

app.listen(3000, () => console.log("API Gateway running on 3000"));