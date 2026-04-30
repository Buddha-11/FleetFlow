# Enterprise-Grade Delivery & E-Commerce Microservices

A highly scalable, distributed system demonstrating the complete lifecycle of an e-commerce order—from secure purchasing and atomic inventory management to real-time driver tracking and automated geofenced delivery completion.

This repository serves as a comprehensive showcase of modern backend architecture, utilizing **Node.js, gRPC, MySQL, Docker, and Kubernetes**.

---

## System Architecture & Theoretical Foundations

### 1. Microservices Paradigm
The system is divided into focused, independent services (`api-gateway`, `user-service`, `product-service`, `order-service`, `location-service`).
*   **Why?** This allows independent scaling, isolated fault domains, and polyglot persistence. If the location tracking service experiences high load, it can be scaled independently of the user authentication service without bringing down the entire system.

### 2. Hybrid Communication: REST + gRPC
*   **REST (External & Gateway Proxies)**: Used for client-to-gateway communication. It's universally understood by web and mobile clients (like the Android Driver App).
*   **gRPC (Internal Service-to-Service)**: The `Order Service` uses gRPC to communicate with `User Service` and `Product Service` for validation before placing an order.
*   **Why?** gRPC uses Protocol Buffers (binary payload) over HTTP/2, making it significantly faster and more lightweight than JSON over REST. It also enforces strict data contracts between microservices, reducing integration bugs.

### 3. Kubernetes Orchestration & Security Boundaries
The entire cluster is orchestrated using Kubernetes.
*   **Zero-Trust Internal Network**: The system is designed so that **only the API Gateway is exposed externally** (via a K8s `NodePort`). All other services (`location`, `order`, `product`, `user`, `mysql`) are isolated within the cluster using `ClusterIP`.
*   **Why?** This enforces a strict security boundary. Clients cannot bypass authentication or manipulate internal services directly. Even the Android driver app must route its raw GPS data through the API Gateway (`/location/update`), which securely proxies it to the internal `location-service`.

---

## Core Business Logic & Algorithms

### Atomic Inventory Management (Concurrency Control)
When an order is placed, the `Product Service` deducts stock.
*   **The Problem**: If two users order the last item at the exact same millisecond, a race condition could result in negative stock.
*   **The Solution**: We utilize MySQL's `SELECT ... FOR UPDATE` within a transaction. This creates a pessimistic row-level lock, forcing concurrent requests to queue up and ensuring strict data integrity.

### Real-Time Geofencing (The Haversine Formula)
The system automatically transitions an order from `IN_TRANSIT` to `DELIVERED` without manual driver input.
*   **How it works**: The `Order Service` polls the `Location Service` for the driver's current coordinates. It then compares this against the order's target `deliveryLocation`.
*   **The Math**: We implemented the **Haversine Formula** to calculate the great-circle distance between two points on a sphere (the Earth) given their longitudes and latitudes.
*   **Why?** This allows us to create a precise 50-meter geofence natively in the backend without relying on expensive, rate-limited external APIs (like Google Maps Distance Matrix).

### Stateless Role-Based Access Control (RBAC)
Authentication is handled centrally at the API Gateway using JSON Web Tokens (JWT).
*   **Why?** JWTs are stateless. The API Gateway doesn't need to query a database to verify a session; it cryptographically verifies the token signature locally.
*   **Roles**: The gateway enforces roles (`ADMIN` vs `USER`). Only Admins can inject new inventory, while Users can place orders.

---

## Technology Stack

*   **Backend Framework**: Node.js with Express.js
*   **RPC Framework**: gRPC & Protocol Buffers (`proto3`)
*   **Database**: MySQL 8.0 (ConfigMap seeded, Persistent Volumes)
*   **Containerization**: Docker
*   **Orchestration**: Kubernetes (Deployments, Services, ConfigMaps, Liveness/Readiness Probes)
*   **Mobile Client**: Android SDK (Kotlin) with Google Play Location Services
*   **Tunneling**: ngrok (Exposes local K8s NodePort to the public internet)

---

## Database Schema Overview

The MySQL database (`ecommerce`) is automatically seeded on startup using a Kubernetes `ConfigMap`.

| Table | Core Columns | Relationships / Constraints |
| :--- | :--- | :--- |
| **Users** | `id`, `email`, `password` (bcrypt), `role` | `role` is ENUM('ADMIN', 'USER') |
| **Products**| `id`, `name`, `price`, `stock` | `stock` cannot drop below 0 |
| **Orders** | `id`, `status`, `delivery_lat`, `delivery_lng`, `driver_id`| FK to `Users(id)` and `Products(id)` |

*Order Status Lifecycle: `PLACED` → `ASSIGNED` → `IN_TRANSIT` → `DELIVERED`*

---

## Setup & Deployment Guide (For Evaluation)

### Prerequisites
1.  **Docker Desktop** installed with **Kubernetes enabled**.
2.  **ngrok** installed (for tunneling mobile traffic).
3.  **Android Studio** or an Android device for the Driver App.

### 1. Build Docker Images Locally
Because we use `imagePullPolicy: Never` in Kubernetes to keep things local, you must build the images first:
```bash
docker build -t api-gateway:latest ./api-gateway
docker build -t user-service:latest ./user-service
docker build -t product-service:latest ./product-service
docker build -t order-service:latest ./order-service
docker build -t location-service:latest ./location-service
```

### 2. Deploy to Kubernetes
Apply the configuration files to start the cluster:
```bash
kubectl apply -f k8s/mysql-configmap.yaml
kubectl apply -f k8s/mysql.yaml
kubectl apply -f k8s/user-service.yaml
kubectl apply -f k8s/product-service.yaml
kubectl apply -f k8s/order-service.yaml
kubectl apply -f k8s/location-service.yaml
kubectl apply -f k8s/api-gateway.yaml
```

*Wait until all pods are running (`kubectl get pods`).*

### 3. Expose API Gateway to Mobile
Run ngrok to expose the Kubernetes `NodePort` (30007) securely:
```bash
ngrok http 30007
```
*Copy the `https://xxxx.ngrok-free.app` URL for the Android app.*

---

## Comprehensive API Evaluation Demo

Follow these exact steps to demonstrate the full system capabilities to the evaluator. The database is pre-seeded (Passwords are `123`), but creating new entities proves the flow works.

### Phase 1: Admin & Inventory Management
**1. Register an Admin Account**
```http
POST http://localhost:30007/register
{
  "name": "Admin", "email": "admin2@test.com", "password": "123", "role": "ADMIN"
}
```

**2. Login as Admin** *(Copy the `token` from the response)*
```http
POST http://localhost:30007/login
{ "email": "admin2@test.com", "password": "123" }
```

**3. Add Inventory (Requires ADMIN Token)**
```http
POST http://localhost:30007/admin/product
Headers: Authorization: Bearer <ADMIN_TOKEN>

{
  "name": "Sony Headphones", "price": 299.99, "description": "Noise cancelling", "stock": 5
}
```
**Technical Note**: The API Gateway uses a Role-Based Access Control (RBAC) middleware to verify the `role` claim within the JWT payload before forwarding requests to sensitive product management endpoints.

---

### Phase 2: User Checkout & Order Orchestration
**4. Register a User Account**
```http
POST http://localhost:30007/register
{
  "name": "User", "email": "user2@test.com", "password": "123", "role": "USER"
}
```

**5. Login as User** *(Copy the `token` from the response)*
```http
POST http://localhost:30007/login
{ "email": "user2@test.com", "password": "123" }
```

**6. Place the Order (Set Geofence Target)**
*Set the `lat` and `lng` to your physical location (or wherever the driver app will start).*
```http
POST http://localhost:30007/order
Headers: Authorization: Bearer <USER_TOKEN>

{
  "productId": 4, 
  "deliveryLocation": { "lat": 25.4270, "lng": 81.7711 }
}
```
**Workflow Insight**: Upon receiving this request, the API Gateway routes it to the `Order Service`. The `Order Service` then initiates high-performance **gRPC** calls to the `User` and `Product` services for validation and utilizes a **pessimistic database lock** to deduct stock before assigning the order to `driver1`.

---

### Phase 3: Real-Time Mobile Tracking
**7. Start the Driver App**
1. Open the Android App.
2. Enter the **ngrok URL** (`https://xxxx.ngrok-free.app`).
3. Click **Enable Location Tracking**.

**Security Insight**: The mobile app communicates with the public-facing API Gateway. The Gateway then securely proxies the coordinate data to the internal `Location Service`, which remains isolated from the public internet within the Kubernetes cluster.

**8. Verify Logs (Optional)**
```bash
kubectl logs -f deployment/location-service
```
*You should see the driver coordinates streaming into the cluster.*

---

### Phase 4: Automated Delivery Verification
**9. Poll the Order Status**
```http
GET http://localhost:30007/order/1/status
Headers: Authorization: Bearer <USER_TOKEN>
```
*   **Result 1 (`IN_TRANSIT`)**: If the driver is moving but > 50 meters away, the status dynamically returns `IN_TRANSIT`.
*   **Result 2 (`DELIVERED`)**: Once the driver app's coordinates match the `deliveryLocation` coordinates (within 50m), the Haversine formula triggers. The database is updated, and the response returns `DELIVERED` automatically.

**System Automation**: This sequence demonstrates the end-to-end automation of the order lifecycle—integrating the API Gateway, internal gRPC orchestration, and real-time mobile GPS tracking to achieve automated fulfillment without manual intervention.
