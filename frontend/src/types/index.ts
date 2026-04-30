export interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
}

export interface Product {
  id: number;
  name: string;
  price: string | number;
  description: string;
  stock: number;
  created_at?: string;
}

export interface OrderStatusResponse {
  orderId: number;
  status: 'PLACED' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED';
  driverId?: string;
  driverLocation?: { lat: number; lng: number; updatedAt?: string };
  deliveryLocation?: { lat: number; lng: number };
}

export interface LocalOrder {
  orderId: number;
  productName: string;
  productId: number;
  status: string;
  placedAt: string;
  deliveryLocation: { lat: number; lng: number };
}
