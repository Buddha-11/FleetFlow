const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.post('/update-location', (req, res) => {
  const { driverId, lat, lng } = req.body;

  if (!driverId || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Missing driverId, lat, or lng' });
  }

  console.log(`Driver ${driverId} → Lat: ${lat}, Lng: ${lng}`);

  res.json({ status: 'received' });
});

app.listen(4000, '0.0.0.0', () => {
  console.log('Location service running on port 4000');
});
