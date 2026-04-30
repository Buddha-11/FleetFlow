import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp up to 50 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users and hold
    { duration: '30s', target: 0 },  // Ramp down to 0 users
  ],
};

const BASE_URL = 'http://localhost:30007';

export function setup() {
  // Setup code: Register and login to get a token
  const payload = JSON.stringify({
    name: 'Test User',
    email: `testuser_${Math.random().toString(36).substring(7)}@test.com`,
    password: '123',
    role: 'USER',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  // Register
  http.post(`${BASE_URL}/register`, payload, params);

  // Login
  const loginRes = http.post(`${BASE_URL}/login`, payload, params);

  let token = null;
  try {
    token = loginRes.json('token');
  } catch (e) {
    console.error("Failed to extract token:", e);
  }

  return { token: token };
}

export default function (data) {
  const token = data.token;
  if (!token) return;

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  // 1. Fetch Products
  let res = http.get(`${BASE_URL}/products`, params);
  check(res, { 'GET /products status was 200': (r) => r.status === 200 });

  sleep(Math.random() * 2);

  // 2. Place an Order
  // const orderPayload = JSON.stringify({
  //   productId: 1, // Assumes product ID 1 exists
  //   deliveryLocation: { lat: 25.4270, lng: 81.7711 },
  // });

  // res = http.post(`${BASE_URL}/order`, orderPayload, params);
  // check(res, { 'POST /order status was 200 or 201': (r) => r.status === 200 || r.status === 201 });

  // sleep(Math.random() * 2);

  // 3. Hit the Stress Endpoint to simulate CPU intensive operations and trigger HPA
  res = http.get(`${BASE_URL}/stress`, params);
  check(res, { 'GET /stress status was 200': (r) => r.status === 200 });

  sleep(Math.random() * 2);
}
