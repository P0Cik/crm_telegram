export interface Car {
  id: string;
  make: string;
  model: string;
  modelGroup?: string;
  badge?: string;          // комплектация (RU/исходная)
  badgeEn?: string;        // комплектация (EN)
  year: number;
  yearMonth?: number;      // YYYYMM
  priceWon: number;
  priceRub: number;
  originPriceKrw?: number; // цена нового (воны)
  images: string[];
  country: string;
  dateAdded: string;
  engineVolume: number; // in liters, e.g. 1.5
  fuelType: string; // отображение: "Бензин" | "Дизель" | "Гибрид" | ...
  gearbox: string; // "Автомат" | "Механика" | ...
  color: string;
  colorHex?: string;
  interiorColor?: string;
  interiorColorHex?: string;
  mileage: number; // in km
  bodyType?: string;
  seatCount?: number | null;
  salesStatus?: string;
  hasAccidentRecord?: boolean | null;
  region?: string;
  vin: string;
  vehicleNo?: string;
  isPopular?: boolean;
}

// Универсальный ответ пагинации DRF (PageNumberPagination)
export interface PaginatedResult<T> {
  results: T[];
  count: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Элемент справочника (марка / группа моделей / модель)
export interface CatalogOption {
  id: number;
  name: string;
  brand_id?: number;
  model_group_id?: number;
  count?: number;
}

// Значение перечисления с количеством (топливо/КПП/кузов/цвет/регион)
export interface FacetValue {
  value: string;
  display?: string;
  count: number;
}

// Количество мест с числом авто
export interface SeatCountValue {
  value: number;
  count: number;
}

export interface FilterOptions {
  brands: CatalogOption[];
  model_groups: CatalogOption[];
  models: CatalogOption[];
  fuel_types: FacetValue[];
  transmissions: FacetValue[];
  body_types: FacetValue[];
  colors: FacetValue[];
  interior_colors: FacetValue[];
  seat_counts: SeatCountValue[];
  regions: FacetValue[];
  total: number;
  year_range: { min: number | null; max: number | null };
  mileage_range: { min: number | null; max: number | null };
  price_range: { min: number | null; max: number | null };
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
  status: OrderStatus;
  rawStatus?: string;
  dateCreated: string;
  expectedDeliveryDate: string;
  checkpoints: Checkpoint[];
}

export interface Subscription {
  id: string;
  make: string;          // марка (отображение)
  model: string;         // группа моделей (отображение)
  brandId?: number | null;
  modelGroupId?: number | null;
  yearFrom?: number;
  yearTo?: number;
  priceRubFrom?: number;
  priceRubTo?: number;
  mileageFrom?: number;
  mileageTo?: number;
  engineVolumeFrom?: number;
  engineVolumeTo?: number;
  fuelType?: string;
  gearbox?: string;      // КПП (хранимое отображение, напр. "Автомат")
  bodyType?: string;
  color?: string;
}

// Фильтры поиска. Названия — для чипов в UI, *Id — для точной фильтрации в API.
export interface SearchFilters {
  make: string;
  brandId: number | null;
  model: string;
  modelGroupId: number | null;
  yearFrom: string;
  yearTo: string;
  priceFrom: string;   // млн рублей, напр. "1.19"
  priceTo: string;
  mileageFrom: string; // км
  mileageTo: string;
  engineVolumeFrom: string; // литры
  engineVolumeTo: string;
  fuelType: string;    // '' = все, иначе canonical value (PETROL, DIESEL, ...)
  transmission: string; // '' = все, иначе хранимое отображение ("Автомат")
  bodyType: string;
  color: string;
  interiorColor: string;
  seatCount: string;   // '' = любое, иначе число мест
  sort: string;        // ordering: '', '-first_seen_at', 'price_krw', '-price_krw', ...
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
