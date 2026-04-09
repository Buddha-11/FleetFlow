const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const SECRET = "mysecretkey";

app.post('/login', (req, res) =>
{
  const { username } = req.body;

  const token = jwt.sign({ username }, SECRET, { expiresIn: '1h' });

  res.json({ token });
});

function authenticate(req, res, next)
{
  const authHeader = req.headers['authorization'];

  if (!authHeader) return res.status(401).send("No token");

  const token = authHeader.split(' ')[1];

  jwt.verify(token, SECRET, (err, user) =>
  {
    if (err) return res.status(403).send("Invalid token");

    req.user = user;
    next();
  });
}

app.post('/order', authenticate, async (req, res) =>
{
  try
  {
    const response = await axios.post(
      'http://order-service:3003/order',
      req.body
    );

    res.json(response.data);
  }
  catch (err)
  {
    res.status(500).send("Error placing order");
  }
});

app.listen(3000, () => console.log("API Gateway running on 3000"));