CREATE DATABASE IF NOT EXISTS ecommerce;
USE ecommerce;

-- ─── Table Structures ────────────────────────────────────────────────────────

CREATE TABLE Users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'USER') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  stock INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  product_id INT,
  delivery_lat DOUBLE,
  delivery_lng DOUBLE,
  driver_id VARCHAR(50),
  status ENUM('PLACED','ASSIGNED','IN_TRANSIT','DELIVERED') NOT NULL DEFAULT 'PLACED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id),
  FOREIGN KEY (product_id) REFERENCES Products(id)
);

-- ─── Seed Data ───────────────────────────────────────────────────────────────

-- Users (Password for both is '123')
INSERT INTO Users (name, email, password, role) VALUES 
('Admin', 'admin@test.com', '$2b$10$mkZ2dfVjo1Cfsl1V6s1Mp.vIOYj8CS7vLF70gSkiES86.wbUWK6ie', 'ADMIN'),
('User', 'user@test.com', '$2b$10$Z36VPzgwM1UcRFZ8/ypgmuKMFxTHv.LhRZZPYJCVaFo8RLeH4oqhu', 'USER');

-- Products
INSERT INTO Products (name, price, description, stock) VALUES 
('Gaming Laptop', 1499.99, 'High performance laptop with M3 chip', 10),
('Wireless Mouse', 49.99, 'Ergonomic wireless mouse', 50),
('Mechanical Keyboard', 129.99, 'RGB backlit mechanical keyboard', 25);
