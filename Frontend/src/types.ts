export interface Car {
  id: string;
  make: string;
  model: string;
  modelGroup?: string;
  year: number;
  priceWon: number;
  priceRub: number;
  images: string[];
  country: string;
  dateAdded: string;
  engineVolume: number; // in liters, e.g. 1.5
  fuelType: string; // "бензин" | "дизель" | "гибрид" | "электро"
  gearbox: string; // "робот" | "автомат" | "механика"
  color: string;
  mileage: number; // in km
  bodyType?: string;
  salesStatus?: string;
  vin: string;
  isPopular?: boolean;
  // Поля ниже отсутствуют в источнике Encar — оставлены опциональными
  // для обратной совместимости (не заполняются API).
  wheelPosition?: string;
  driveType?: string;
  power?: number;
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
  rawStatus?: string; // Исходный статус из БД для админки
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
  mileageFrom?: number;
  mileageTo?: number;
  engineVolumeFrom?: number;
  engineVolumeTo?: number;
  powerFrom?: number;
  powerTo?: number;
  fuelType?: string;
  gearbox?: string;
  wheelPosition?: string;
  driveType?: string;
  color?: string;
  country?: string;
  condition?: string;
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
  | 'edit-subscription'
  | 'admin-dashboard';

export type UserRole = 'client' | 'manager' | 'admin';

export interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  patronymic?: string;
  full_name: string;
  phone: string;
  email: string;
  role: UserRole;
  role_display?: { value: string; display: string };
  is_active: boolean;
  telegram_id?: string;
}
