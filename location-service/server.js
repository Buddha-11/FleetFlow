const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// ─── In-memory driver location store ─────────────────────────────────────────
const driverLocations = {};

// ─── POST /update-location ────────────────────────────────────────────────────
app.post('/update-location', (req, res) => {
  const { driverId, lat, lng } = req.body;

  if (!driverId || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Missing driverId, lat, or lng' });
  }

  driverLocations[driverId] = { lat, lng, updatedAt: new Date().toISOString() };

  console.log(`Driver ${driverId} → Lat: ${lat}, Lng: ${lng}`);

  res.json({ status: 'received' });
});

// ─── GET /driver-location/:driverId ──────────────────────────────────────────
// Called internally by Order Service to check driver proximity
app.get('/driver-location/:driverId', (req, res) => {
  const { driverId } = req.params;
  const location = driverLocations[driverId];

  if (!location) {
    return res.status(404).json({ error: `No location data for driver: ${driverId}` });
  }

  res.json({ driverId, location });
});

// ─── GET /all-drivers ─────────────────────────────────────────────────────────
// Useful for debugging all active drivers
app.get('/all-drivers', (req, res) => {
  res.json(driverLocations);
});

app.listen(4000, '0.0.0.0', () => {
  console.log('Location service running on port 4000');
});
