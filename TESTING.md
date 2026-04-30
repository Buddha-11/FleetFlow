# 🧪 Microservices Workflow Testing Guide

This guide contains the exact steps to demonstrate the full capabilities of the E-Commerce & Delivery system. Follow these steps sequentially for a successful presentation.

---

## 🛠️ Phase 0: Environment Preparation

### 1. Start the Microservices
Run this in your terminal to build and start the containers:
```bash
docker-compose up --build
```
💡each service is isolated in its own container and they communicate via a private Docker network.

### 2. Expose the Location Service
Run ngrok to allow your mobile phone to communicate with the local server:
```bash
ngrok http 4000
```
*   **Action**: Copy the `https://...` URL.
*   **Action**: Paste this URL into your **Android Driver App**.

---

## 🔐 Phase 1: Admin & Inventory Setup

### 1. Register the Admin
*   **Request**: `POST http://localhost:3000/register`
*   **Body**:
    ```json
    {
      "name": "Admin User",
      "email": "admin@test.com",
      "password": "123",
      "role": "ADMIN"
    }
    ```

### 2. Login as Admin
*   **Request**: `POST http://localhost:3000/login`
*   **Body**: `{ "email": "admin@test.com", "password": "123" }`
*   **Action**: Copy the `token` from the response.

### 3. Create a Product with Stock
*   **Request**: `POST http://localhost:3000/admin/product`
*   **Headers**: `Authorization: Bearer <ADMIN_TOKEN>`
*   **Body**:
    ```json
    {
      "name": "Gaming Laptop",
      "price": 1200.00,
      "description": "High performance laptop",
      "stock": 5
    }
    ```
💡The system now supports **persistent inventory levels** in MySQL, moving away from in-memory arrays.

---

## 🛍️ Phase 2: User Purchase Flow

### 1. Register & Login as User
Repeat the registration/login steps but use `role: "USER"`. Save the **User Token**.

### 2. Place an Order
*   **Request**: `POST http://localhost:3000/order`
*   **Headers**: `Authorization: Bearer <USER_TOKEN>`
*   **Body**:
    ```json
    {
      "productId": 1,
      "deliveryLocation": {
        "lat": 25.4270,
        "lng": 81.7711
      }
    }
    ```
💡When this order is placed:
1.  The **Order Service** calls the **Product Service** via **gRPC** to deduct stock atomically.
2.  The order is initialized with status `ASSIGNED`.

---

## 📍 Phase 3: Live Delivery Tracking

### 1. Connect the Driver App
1.  Open the Driver App on your phone.
2.  Click **Enable Location Tracking**.
3.  **Action**: Run `docker logs -f location-service` to observe the live GPS coordinates hitting the backend.

### 2. Check Live Status (In-Transit)
*   **Request**: `GET http://localhost:3000/order/1/status`
*   **Headers**: `Authorization: Bearer <USER_TOKEN>`
*   **Expected Status**: `IN_TRANSIT`
*   **Explanation**: The system fetches the driver's location from the `Location Service` and compares it to the delivery target.

---

## 🏁 Phase 4: Automated Completion

### 1. Arrive at Target
Move the phone (or manually update coordinates) to match the `deliveryLocation` (`25.4270, 81.7711`).

### 2. Verify Delivery
*   **Request**: `GET http://localhost:3000/order/1/status`
*   **Headers**: `Authorization: Bearer <USER_TOKEN>`
*   **Expected Status**: `DELIVERED` ✅

💡 **Technical Note**: The **Geofencing Logic** utilizes the **Haversine Formula** to calculate the precise distance between the driver and the delivery target. If the distance is `< 50 meters`, the status is updated to `DELIVERED` automatically.

---

## ✅ Final System Verification Checklist
1.  **Database Check**: Show the `Orders` and `Products` tables in MySQL to prove persistence.
2.  **Stock Check**: Show that the laptop stock decreased from `5` to `4`.
3.  **Security**: Try to call `POST /admin/product` with a **User Token** to show the **Role-Based Access Control (RBAC)** in action (it should return `403 Forbidden`).
