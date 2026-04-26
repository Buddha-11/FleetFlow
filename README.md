# 🛒 E-Commerce Microservices (Docker + REST + gRPC)

---

## 📌 Overview

This project implements a **production-like E-commerce microservices architecture**. Originally demonstrating basic microservices concepts, it has been expanded to include persistent databases, secure authentication, real-time location tracking, and an Android mobile client.

It demonstrates:
- Microservice-based design
- REST and gRPC hybrid communication
- **MySQL Database Integration** via Docker volumes
- **Role-Based Authentication (JWT)**
- **Real-time Location Tracking Service**
- **Android Client Integration (Kotlin)**

---

## 🏗️ High-Level Architecture

```text
Client (Web/Postman)                     Driver App (Android)
  ↓ (REST)                                     ↓ (REST via ngrok HTTPS)
API Gateway                               Location Service (Port 4000)
  ↓ (REST)                                     ↓ (Logs)
Services (User, Product, Order)           Real-time Tracking Data
  ↓ (gRPC for validation)
MySQL Database (Persistent Volume)
```

---

## ✨ Key Features

### 1. 🗄️ Database Integration
- **MySQL** running via Docker container with a persistent volume (`mysql-data`).
- Tables for `Users`, `Products`, and `Orders` initialized automatically via `init.sql`.
- Provides reliable, persistent storage replacing older in-memory data arrays.

### 2. 🔐 Role-Based Authentication
- Secure JWT-based authentication handled centrally by the API Gateway.
- Uses `bcrypt` for password hashing.
- Two explicit roles:
  - **ADMIN**: Can add new products (`POST /admin/product`).
  - **USER**: Can browse products (`GET /products`) and place orders (`POST /order`).
- Protected routes ensure unauthorized access is blocked.

### 3. 📍 Location Tracking Service
- A dedicated microservice (`location-service/`) listening on port 4000.
- Exposes a REST endpoint `POST /update-location` to receive live GPS coordinates.
- Logs driver data directly into Docker for real-time tracking visualization.

### 4. 📱 Driver App (Android)
- An Android application built with **Kotlin** and XML UI located in `driver-app/`.
- Uses Google Play Services Location API.
- Captures high-accuracy GPS coordinates and broadcasts them to the backend Location Service using a secure `ngrok` tunnel.

---

## 🐳 Docker Setup

The system is fully containerized. Each service runs in its own isolated environment:
- `api-gateway` (Port 3000)
- `user-service` (Port 3001 & gRPC 50051)
- `product-service` (Port 3002 & gRPC 50052)
- `order-service` (Port 3003)
- `location-service` (Port 4000)
- `mysql-db` (Port 3307 mapped to host, 3306 internal)

---

## ▶️ Setup Instructions

### 🔹 1. Clone & Start Backend Services
```bash
git clone <repo-url>
cd cec-term-project
docker-compose up --build
```
*Wait until MySQL logs indicate it is ready for connections before testing.*

### 🔹 2. Expose Location Service to the Internet
The Driver App needs a secure HTTPS connection to send GPS data from a mobile device.
```bash
ngrok http 4000
```
*Copy the `https://xxxx.ngrok-free.app` URL provided by ngrok.*

### 🔹 3. Driver App Setup (Android)
1. Open the `driver-app/` folder in **Android Studio**.
2. Build the APK or run the app directly on your physical Android device.
3. Open the app and enter your ngrok URL.
4. Grant Location Permissions when prompted.
5. Click **Enable Location Tracking** to start broadcasting.

---

## 🧪 Testing Guide

### 🔹 Authentication Flow
**1. Register an Admin**
```http
POST http://localhost:3000/register
{
  "name": "Admin",
  "email": "admin@test.com",
  "password": "123",
  "role": "ADMIN"
}
```

**2. Register a User**
```http
POST http://localhost:3000/register
{
  "name": "User",
  "email": "user@test.com",
  "password": "123",
  "role": "USER"
}
```

**3. Login (Retrieve JWT)**
```http
POST http://localhost:3000/login
{
  "email": "user@test.com",
  "password": "123"
}
```

### 🔹 Admin: Add a Product
```http
POST http://localhost:3000/admin/product
Header: Authorization: Bearer <admin_jwt_token>

{
  "name": "Gaming Laptop",
  "price": 1499.99,
  "description": "High performance laptop"
}
```

### 🔹 User: Fetch Products & Place Order
**Fetch Products:**
```http
GET http://localhost:3000/products
Header: Authorization: Bearer <user_jwt_token>
```

**Place Order:**
```http
POST http://localhost:3000/order
Header: Authorization: Bearer <user_jwt_token>

{
  "productId": 1
}
```
*(The `userId` is securely extracted from the JWT token by the API Gateway).*

### 🔹 Location Tracking
Once the Android Driver app is running and broadcasting, check the location service logs:
```bash
docker-compose logs -f location-service
```

---

## 📦 Example Outputs

**Order Response:**
```json
{
  "message": "Order placed successfully",
  "orderId": 1,
  "user": {
    "id": "2",
    "name": "User",
    "email": "user@test.com",
    "role": "USER"
  },
  "product": {
    "id": "1",
    "name": "Gaming Laptop",
    "price": 1499.99,
    "description": "High performance laptop"
  }
}
```

**Location Tracking Logs:**
```text
location-service  | Driver driver1 → Lat: 28.613900, Lng: 77.209000
location-service  | Driver driver1 → Lat: 28.614000, Lng: 77.209150
```

---

## ⚠️ Limitations & Future Work

- **No Real-Time UI Dashboard:** Location tracking currently only outputs to the console logs. A frontend mapping UI (e.g., using WebSockets and Google Maps) is planned.
- **Location Data Not Persisted:** Live coordinates are processed but not stored in a database (like Redis or PostgreSQL/PostGIS) for historical playback.
- **No Scaling Configurations (Yet):** Services run as single instances; no load balancers or orchestrators (like Kubernetes) are used at this stage.
