# 🛒 E-Commerce Microservices (Docker + REST + gRPC)

---

## 📌 Overview

This project implements a simple **E-commerce microservices architecture** using:

- API Gateway
- User Service
- Product Service
- Order Service

It demonstrates:
- Microservice-based design
- REST and gRPC hybrid communication
- Docker containerization
- Service-to-service communication

---

## 🏗️ High-Level Architecture

```
Client
  ↓ (REST)
API Gateway
  ↓ (REST)
Order Service
  ↓ (gRPC)        ↓ (gRPC)
User Service   Product Service
```
<img width="576" height="521" alt="image" src="https://github.com/user-attachments/assets/348abefc-3d30-4daf-89cb-6f845ccd49ff" />


---

## 🔄 Request Flow

### 🔹 Step 1: Authentication
- Client sends request to `/login`
- API Gateway generates a JWT token
- Token is returned to client

---

### 🔹 Step 2: Place Order
Client sends:

```
POST /order
Authorization: Bearer <token>

{
  "userId": "1",
  "productId": "1"
}
```

---

### 🔹 Step 3: API Gateway
- Verifies JWT token
- If valid → forwards request to Order Service
- Communication: **REST**

---

### 🔹 Step 4: Order Service
- Receives request
- Extracts:
  - userId
  - productId
- Calls:
  - User Service (gRPC)
  - Product Service (gRPC)

---

### 🔹 Step 5: Internal Communication (gRPC)

#### ➤ Order → User Service
```
GetUser({ id: userId })
```

#### ➤ Order → Product Service
```
GetProduct({ id: productId })
```

---

### 🔹 Step 6: Response Aggregation
- Order Service combines:
  - User data
  - Product data
- Creates final response

---

### 🔹 Step 7: Final Response

```
Order Service → API Gateway → Client
```

---

## 🌐 Communication Protocols

### 🔹 REST (HTTP + JSON)
Used for:
- Client → API Gateway
- API Gateway → Order Service

**Why REST?**
- Easy to use
- Standard HTTP protocol
- Works with browsers/Postman

---

### 🔹 gRPC (Protocol Buffers)
Used for:
- Order Service → User Service
- Order Service → Product Service

**Why gRPC?**
- Faster than REST
- Uses binary format
- Strongly typed using `.proto` files

---

## 🔧 Services Description

### 🔹 API Gateway
- Entry point for all requests
- Handles authentication (JWT)
- Routes requests to Order Service

---

### 🔹 User Service
- Manages user data
- Provides user details via gRPC

---

### 🔹 Product Service
- Manages product data
- Provides product details via gRPC

---

### 🔹 Order Service
- Core business logic
- Coordinates between services
- Fetches user and product data
- Simulates order placement

---

## 🔗 Service Communication

| From            | To              | Protocol |
|-----------------|----------------|----------|
| Client          | API Gateway    | REST     |
| API Gateway     | Order Service  | REST     |
| Order Service   | User Service   | gRPC     |
| Order Service   | Product Service| gRPC     |

---

## 🐳 Docker Setup

Each service runs in its own container.

Docker enables:
- Isolation of services
- Easy deployment
- Internal networking via service names

Example:
```
user-service:50051
product-service:50052
order-service:3003
```

---

## ▶️ How to Run the Project

### 🔹 Step 1: Clone Repository
```
git clone <repo-url>
cd ecommerce-docker
```

---

### 🔹 Step 2: Start Services
```
docker-compose up --build
```

---

### 🔹 Step 3: Test APIs

#### ➤ Login
```
POST http://localhost:3000/login
```

Body:
```
{
  "username": "atharva"
}
```

---

#### ➤ Place Order
```
POST http://localhost:3000/order
```

Headers:
```
Authorization: Bearer <token>
```

Body:
```
{
  "userId": "1",
  "productId": "1"
}
```

---

## 📦 Example Response

```
{
  "message": "Order placed successfully",
  "user": {
    "id": "1",
    "name": "Atharva"
  },
  "product": {
    "id": "1",
    "name": "Laptop",
    "price": 50000
  }
}
```

---

## ⚠️ Limitations

- No database (in-memory data)
- Orders are not persisted
- No retries or fault tolerance

---

## 📚 Key Learnings

- Microservices architecture design
- REST vs gRPC usage
- Docker containerization
- Service-to-service communication
- API Gateway pattern

---

## 🚀 Future Improvements

- Add database (MongoDB/PostgreSQL)
- Persist orders
- Add retry & circuit breaker
- Add role-based authentication
- Deploy on Kubernetes

---

## 🎯 Conclusion

This project demonstrates a **real-world microservice architecture** where:
- API Gateway handles authentication and routing
- Order Service orchestrates logic
- gRPC ensures efficient internal communication
- Docker manages deployment
