export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  priceWon: number;
  priceRub: number;
  images: string[];
  country: string;
  dateAdded: string;
  engineVolume: number; // in liters, e.g. 1.5
  fuelType: string; // "бензин" | "дизель" | "гибрид" | "электро"
  gearbox: string; // "робот" | "автомат" | "механика"
  wheelPosition: string; // "левый" | "правый"
  driveType: string; // "передний" | "задний" | "полный"
  color: string;
  mileage: number; // in km
  power: number; // in hp
  vin: string;
  isPopular?: boolean;
}

export interface Checkpoint {
  id: string;
  statusText: string;
  date: string;
  imageUrl: string;
  inspectorName: string;
  inspectionTime: string;
}

export type OrderStatus = 'dealing' | 'korea_warehouse' | 'shipping' | 'delivered';

export interface Order {
  id: string;
  carId: string;
  carDetails: Car;
  clientName: string;
  clientPhone: string;
  status: OrderStatus; // 'dealing' (сделка), 'korea_warehouse' (склад корея), 'shipping' (в пути), 'delivered' (ключи)
  dateCreated: string;
  expectedDeliveryDate: string;
  checkpoints: Checkpoint[];
}

export interface Subscription {
  id: string;
  make: string;
  model: string;
  yearFrom?: number;
  yearTo?: number;
  priceRubFrom?: number;
  priceRubTo?: number;
}

export interface SearchFilters {
  make: string;
  model: string;
  condition: 'all' | 'new' | 'used';
  yearFrom: string;
  yearTo: string;
  priceFrom: string; // in million rubles, e.g. "1.19"
  priceTo: string;
  engineVolumeFrom: string;
  engineVolumeTo: string;
  powerFrom: string;
  powerTo: string;
  fuelType: string;
  gearbox: string;
  wheelPosition: string;
  driveType: string;
  color: string;
  country: string;
}

export type AppView =
  | 'home'
  | 'makes-selector'
  | 'models-selector'
  | 'filters'
  | 'listings'
  | 'car-details'
  | 'orders-list'
  | 'order-tracking'
  | 'order-checkpoint-photo'
  | 'subscriptions-list'
  | 'admin-dashboard';

export type UserRole = 'client' | 'manager';
