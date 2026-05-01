# 🌐 API Endpoints Reference

This document outlines all the REST API endpoints available through the **API Gateway** (`http://localhost:30007`). 

Since the system uses a Zero-Trust architecture, **all external traffic must be routed through the API Gateway**. Internal services (User, Product, Order, Location) are completely isolated within the Kubernetes cluster and cannot be accessed directly from the outside.

---

## 🔐 Authentication & Authorization
All protected endpoints require a Bearer token in the `Authorization` header.

**Header Format:**
```http
Authorization: Bearer <YOUR_JWT_TOKEN>
```

**Roles:**
*   `USER`: Standard permissions (browsing, ordering).
*   `ADMIN`: Elevated permissions (adding products).

---

## 🧑‍💻 1. Authentication & Users

### 1.1 Register a New User
Create a new user account. The API Gateway forwards this to the internal **User Service**.

*   **URL:** `/register`
*   **Method:** `POST`
*   **Auth Required:** ❌ No

**Request Body (JSON):**
```json
{
  "name": "John Doe",
  "email": "john@test.com",
  "password": "securepassword123",
  "role": "USER" // Must be "USER" or "ADMIN"
}
```

**Success Response (201 Created):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@test.com",
  "role": "USER"
}
```

### 1.2 Login
Authenticate a user and return a JWT. The API Gateway fetches user details from the internal **User Service** and compares password hashes.

*   **URL:** `/login`
*   **Method:** `POST`
*   **Auth Required:** ❌ No

**Request Body (JSON):**
```json
{
  "email": "john@test.com",
  "password": "securepassword123"
}
```

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6Ik...",
  "role": "USER"
}
```

---

## 🛍️ 2. Product Management

### 2.1 Get All Products
Retrieve the current inventory. The API Gateway forwards this to the internal **Product Service**.

*   **URL:** `/products`
*   **Method:** `GET`
*   **Auth Required:** ✅ Yes (`USER` or `ADMIN`)

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Wireless Mouse",
    "description": "Ergonomic 2.4GHz wireless mouse",
    "price": 999.99,
    "stock": 50
  }
]
```

### 2.2 Add a New Product (Admin Only)
Add a new item to the inventory.

*   **URL:** `/admin/product`
*   **Method:** `POST`
*   **Auth Required:** ✅ Yes (Must be `ADMIN`)

**Request Body (JSON):**
```json
{
  "name": "Mechanical Keyboard",
  "description": "RGB mechanical keyboard with Blue switches",
  "price": 4500.00,
  "stock": 20
}
```

**Success Response (201 Created):**
```json
{
  "id": 2,
  "name": "Mechanical Keyboard",
  "description": "RGB mechanical keyboard with Blue switches",
  "price": 4500.00,
  "stock": 20
}
```

---

## 📦 3. Order & Checkout Flow

### 3.1 Place an Order
Initiate the purchase of a product. The Gateway injects the `userId` from the JWT token for security before forwarding to the internal **Order Service**. The Order Service utilizes gRPC to deduct stock in the Product Service.

*   **URL:** `/order`
*   **Method:** `POST`
*   **Auth Required:** ✅ Yes (`USER` or `ADMIN`)

**Request Body (JSON):**
```json
{
  "productId": 1,
  "deliveryLocation": {
    "lat": 28.7041,
    "lng": 77.1025
  }
}
```
*(Note: `userId` is automatically extracted from your Bearer token)*

**Success Response (200/201 OK):**
```json
{
  "message": "Order assigned",
  "orderId": 12,
  "driverId": "driver1"
}
```

### 3.2 Get Order Status
Poll for the real-time status of an active order.

*   **URL:** `/order/:id/status`
*   **Method:** `GET`
*   **Auth Required:** ✅ Yes (`USER` or `ADMIN`)

**Success Response (200 OK):**
```json
{
  "orderId": 12,
  "status": "IN_TRANSIT",
  "driverLocation": {
    "lat": 28.7043,
    "lng": 77.1027
  }
}
```
*(Status possibilities: `PLACED`, `ASSIGNED`, `IN_TRANSIT`, `DELIVERED`)*

---

## 📍 4. Delivery & Location Tracking (For Driver App)

### 4.1 Update Driver Location
Used by the Android Driver App to stream live GPS coordinates. The API Gateway proxies this to the internal **Location Service**. The Location Service calculates the Haversine distance and updates the Order Service via gRPC if the driver is within 50 meters.

*   **URL:** `/location/update`
*   **Method:** `POST`
*   **Auth Required:** ❌ No (Simulated driver device)

**Request Body (JSON):**
```json
{
  "driverId": "driver1",
  "lat": 28.70415,
  "lng": 77.10255
}
```

**Success Response (200 OK):**
```json
{
  "status": "Location updated"
}
```

---

## ⚙️ 5. System & Observability

### 5.1 Health Check
Verify that the API Gateway is running and retrieve the specific Kubernetes Pod ID handling the request.

*   **URL:** `/health`
*   **Method:** `GET`
*   **Auth Required:** ❌ No

**Success Response (200 OK):**
```json
{
  "status": "ok",
  "service": "api-gateway",
  "pod": "api-gateway-84d85b4b54-gbg2c"
}
```

### 5.2 CPU Stress Test (For Autoscaling Demo)
Intentionally spin the CPU to simulate heavy load and trigger the Kubernetes Horizontal Pod Autoscaler (HPA).

*   **URL:** `/stress`
*   **Method:** `GET`
*   **Auth Required:** ❌ No

**Success Response (200 OK):**
```json
{
  "message": "Stress test successful",
  "pod": "api-gateway-84d85b4b54-ph8lb"
}
```

---

## 🗺️ Internal Microservices Topology
*(For Reference Only — Not Accessible Externally)*

| Service | Internal K8s DNS | Internal Port | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **API Gateway** | `api-gateway` | `3000` | JWT Validation, Public Proxy, Routing |
| **User Service** | `user-service` | `3001` | MySQL User Data, Password Hashing |
| **Product Service** | `product-service` | `3002` | MySQL Inventory, gRPC Stock Deductions |
| **Order Service** | `order-service` | `3003` | Order Coordination, gRPC Aggregation |
| **Location Service** | `location-service` | `4000` | Haversine Distance Calculation |
