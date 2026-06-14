import axios from 'axios';
import type {
  Car,
  Order,
  Subscription,
  SearchFilters,
  User,
  PaginatedResult,
  FilterOptions,
  CatalogOption,
} from '../types';
import authService from './auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = authService.getAccessToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// «Любая марка/модель» — не отправляем как фильтр
const ANY_VALUES = ['Все марки', 'Любая марка', 'Все модели', 'Любая модель', ''];

// ----- Интерфейсы ответов API -----
interface ApiCar {
  id: number;
  vin: string | null;
  vehicle_no?: string;
  brand: { id: number; name: string } | null;
  model_group?: { id: number; name: string } | null;
  model: { id: number; name: string } | null;
  badge?: string;
  badge_en?: string;
  year: number;
  year_month?: number;
  fuel_type: string;
  fuel_type_display?: string;
  engine_volume: number | null;
  transmission: string;
  color: string;
  color_hex?: string;
  interior_color?: string;
  interior_color_hex?: string;
  body_type?: string;
  seat_count?: number | null;
  sales_status?: string;
  sales_status_display?: string;
  has_accident_record?: boolean | null;
  origin_price_krw?: number | null;
  region?: string;
  price_won?: number;
  price_rub?: number;
  mileage?: number;
  images?: string[];
}

interface ApiOrder {
  id: number;
  car: ApiCar;
  user: any;
  manager: any;
  total_price: string;
  status: string;
  status_history?: any[];
  created_at: string;
  updated_at: string;
}

interface ApiSubscription {
  id: number;
  brand?: { id: number; name: string };
  model_group?: { id: number; name: string };
  model?: { id: number; name: string };
  year_min?: number;
  year_max?: number;
  price_min?: string;
  price_max?: string;
  mileage_min?: number;
  mileage_max?: number;
  min_engine_volume?: string;
  max_engine_volume?: string;
  fuel_type?: string;
  body_type?: string;
  transmission?: string;
  colors?: string;
  status: string;
}

// ----- Преобразователи -----
const transformApiCar = (apiCar: ApiCar): Car => ({
  id: String(apiCar.id),
  make: apiCar.brand?.name ?? '',
  model: apiCar.model_group?.name ?? apiCar.model?.name ?? '',
  modelGroup: apiCar.model_group?.name ?? '',
  badge: apiCar.badge ?? '',
  badgeEn: apiCar.badge_en ?? '',
  year: apiCar.year,
  yearMonth: apiCar.year_month,
  priceWon: apiCar.price_won ?? 0,
  priceRub: Math.round(apiCar.price_rub ?? 0),
  originPriceKrw: apiCar.origin_price_krw ?? undefined,
  images: apiCar.images ?? [],
  country: apiCar.region || 'Южная Корея',
  region: apiCar.region || '',
  dateAdded: new Date().toISOString(),
  engineVolume: apiCar.engine_volume ? apiCar.engine_volume / 1000 : 0,
  fuelType: apiCar.fuel_type_display || apiCar.fuel_type || '',
  gearbox: apiCar.transmission || '',
  color: apiCar.color || '',
  colorHex: apiCar.color_hex || '',
  interiorColor: apiCar.interior_color || '',
  interiorColorHex: apiCar.interior_color_hex || '',
  bodyType: apiCar.body_type || '',
  seatCount: apiCar.seat_count ?? null,
  salesStatus: apiCar.sales_status_display || apiCar.sales_status || '',
  hasAccidentRecord: apiCar.has_accident_record ?? null,
  mileage: apiCar.mileage ?? 0,
  vin: apiCar.vin ?? '',
  vehicleNo: apiCar.vehicle_no ?? '',
});

const transformApiOrder = (apiOrder: ApiOrder): Order => {
  const car = transformApiCar(apiOrder.car);
  return {
    id: apiOrder.id.toString(),
    carId: String(apiOrder.car.id),
    carDetails: car,
    clientName: apiOrder.user?.first_name || 'Клиент',
    clientPhone: apiOrder.user?.phone || '',
    status: mapOrderStatus(apiOrder.status),
    rawStatus: apiOrder.status,
    dateCreated: new Date(apiOrder.created_at).toLocaleDateString('ru-RU'),
    expectedDeliveryDate: '—',
    checkpoints: (apiOrder.status_history || []).map((h: any) => ({
      id: h.id.toString(),
      statusText: h.status_display || h.status,
      date: new Date(h.created_at).toLocaleDateString('ru-RU'),
      imageUrl: h.media_file_url || '',
      inspectorName: h.updated_by?.first_name || 'Менеджер',
      inspectionTime: new Date(h.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    })),
  };
};

const transformApiSubscription = (s: ApiSubscription): Subscription => ({
  id: s.id.toString(),
  make: s.brand?.name || '',
  model: s.model_group?.name || s.model?.name || '',
  brandId: s.brand?.id ?? null,
  modelGroupId: s.model_group?.id ?? null,
  yearFrom: s.year_min,
  yearTo: s.year_max,
  priceRubFrom: s.price_min ? parseFloat(s.price_min) : undefined,
  priceRubTo: s.price_max ? parseFloat(s.price_max) : undefined,
  mileageFrom: s.mileage_min,
  mileageTo: s.mileage_max,
  engineVolumeFrom: s.min_engine_volume ? parseFloat(s.min_engine_volume) : undefined,
  engineVolumeTo: s.max_engine_volume ? parseFloat(s.max_engine_volume) : undefined,
  fuelType: s.fuel_type || undefined,
  gearbox: s.transmission || undefined,
  bodyType: s.body_type || undefined,
  color: s.colors || undefined,
});

const mapOrderStatus = (status: string): 'dealing' | 'korea_warehouse' | 'shipping' | 'delivered' => {
  const statusMap: Record<string, 'dealing' | 'korea_warehouse' | 'shipping' | 'delivered'> = {
    REVIEW: 'dealing', APPLICATION: 'dealing', AWAITING_PAYMENT: 'dealing', PURCHASE: 'dealing',
    TO_WAREHOUSE_KR: 'korea_warehouse', AT_WAREHOUSE_KR: 'korea_warehouse',
    DOCUMENTS: 'korea_warehouse', SHIPPING_PREP: 'korea_warehouse',
    TO_BORDER: 'shipping', CUSTOMS: 'shipping', TO_WAREHOUSE_RU: 'shipping', TO_DESTINATION: 'shipping',
    DELIVERED: 'delivered',
  };
  return statusMap[status] || 'dealing';
};

// Фильтры -> query-параметры CarFilter
const buildSearchParams = (filters: SearchFilters, page: number, pageSize: number): Record<string, any> => {
  const p: Record<string, any> = { page, page_size: pageSize };
  if (filters.brandId) p.brand = filters.brandId;
  else if (filters.make && !ANY_VALUES.includes(filters.make)) p.brand_name = filters.make;
  if (filters.modelGroupId) p.model_group = filters.modelGroupId;
  if (filters.yearFrom) p.year_min = filters.yearFrom;
  if (filters.yearTo) p.year_max = filters.yearTo;
  if (filters.priceFrom) p.price_min = Math.round(parseFloat(filters.priceFrom) * 1_000_000);
  if (filters.priceTo) p.price_max = Math.round(parseFloat(filters.priceTo) * 1_000_000);
  if (filters.mileageFrom) p.mileage_min = filters.mileageFrom;
  if (filters.mileageTo) p.mileage_max = filters.mileageTo;
  if (filters.engineVolumeFrom) p.engine_volume_min = filters.engineVolumeFrom;
  if (filters.engineVolumeTo) p.engine_volume_max = filters.engineVolumeTo;
  if (filters.fuelType) p.fuel_type = filters.fuelType;
  if (filters.transmission) p.transmission = filters.transmission;
  if (filters.bodyType) p.body_type = filters.bodyType;
  if (filters.color) p.color = filters.color;
  if (filters.interiorColor) p.interior_color = filters.interiorColor;
  if (filters.seatCount) p.seat_count = filters.seatCount;
  if (filters.sort) p.ordering = filters.sort;
  return p;
};

const toPaginated = (data: any, page: number, pageSize: number): PaginatedResult<Car> => {
  if (Array.isArray(data)) {
    return {
      results: data.map(transformApiCar), count: data.length,
      page: 1, totalPages: 1, hasNext: false, hasPrev: false,
    };
  }
  const count: number = data.count ?? (data.results?.length ?? 0);
  return {
    results: (data.results ?? []).map(transformApiCar),
    count,
    page,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
    hasNext: Boolean(data.next),
    hasPrev: Boolean(data.previous),
  };
};

const emptyPage: PaginatedResult<Car> = {
  results: [], count: 0, page: 1, totalPages: 1, hasNext: false, hasPrev: false,
};

// ----- API -----
export const api = {
  users: {
    getAll: async (): Promise<User[]> => {
      try {
        const res = await apiClient.get('/users/');
        const results = res.data.results || res.data;
        return Array.isArray(results) ? results.map((u: any) => ({ ...u, id: u.id.toString() })) : [];
      } catch (e) { console.error('Ошибка загрузки пользователей:', e); return []; }
    },
    update: async (id: string, data: Partial<User>): Promise<User | null> => {
      try {
        const res = await apiClient.patch(`/users/${id}/`, data);
        return { ...res.data, id: res.data.id.toString() };
      } catch (e) { console.error('Ошибка обновления пользователя:', e); return null; }
    },
    delete: async (id: string): Promise<boolean> => {
      try { await apiClient.delete(`/users/${id}/`); return true; }
      catch (e) { console.error('Ошибка удаления пользователя:', e); return false; }
    },
  },

  // Полный каталог (все записи, не только с активными авто) — для подписок
  catalog: {
    brands: async (): Promise<CatalogOption[]> => {
      try {
        const res = await apiClient.get('/brands/', { params: { page_size: 100, ordering: 'name_en' } });
        const r = res.data.results || res.data;
        return (r as any[]).map((b) => ({ id: b.id, name: b.name }));
      } catch (e) { console.error('Ошибка загрузки марок:', e); return []; }
    },
    modelGroupsByBrand: async (brandId: number): Promise<CatalogOption[]> => {
      try {
        const res = await apiClient.get('/model-groups/', { params: { brand: brandId, page_size: 100 } });
        const r = res.data.results || res.data;
        return (r as any[]).map((g) => ({ id: g.id, name: g.name, brand_id: g.brand?.id ?? brandId }));
      } catch (e) { console.error('Ошибка загрузки групп моделей:', e); return []; }
    },
  },

  cars: {
    getFilters: async (): Promise<FilterOptions | null> => {
      try {
        const res = await apiClient.get('/cars/filters/');
        return res.data;
      } catch (e) { console.error('Ошибка загрузки фильтров:', e); return null; }
    },

    // Серверная пагинация + фильтры
    search: async (filters: SearchFilters, page = 1, pageSize = 24): Promise<PaginatedResult<Car>> => {
      try {
        const res = await apiClient.get('/cars/', { params: buildSearchParams(filters, page, pageSize) });
        return toPaginated(res.data, page, pageSize);
      } catch (e) { console.error('Ошибка поиска автомобилей:', e); return { ...emptyPage }; }
    },

    // Произвольный запрос (для админки): свободный поиск + любые параметры CarFilter
    query: async (params: Record<string, any>, page = 1, pageSize = 20): Promise<PaginatedResult<Car>> => {
      try {
        const clean: Record<string, any> = { page, page_size: pageSize };
        Object.entries(params).forEach(([k, v]) => {
          if (v !== '' && v !== undefined && v !== null) clean[k] = v;
        });
        const res = await apiClient.get('/cars/', { params: clean });
        return toPaginated(res.data, page, pageSize);
      } catch (e) { console.error('Ошибка загрузки каталога:', e); return { ...emptyPage }; }
    },

    getById: async (id: string): Promise<Car | null> => {
      try {
        const res = await apiClient.get(`/cars/${id}/`);
        return transformApiCar(res.data);
      } catch (e) { console.error('Ошибка загрузки автомобиля:', e); return null; }
    },

    delete: async (id: string): Promise<boolean> => {
      try { await apiClient.delete(`/cars/${id}/`); return true; }
      catch (e) { console.error('Ошибка удаления автомобиля:', e); return false; }
    },
  },

  orders: {
    getAll: async (): Promise<Order[]> => {
      try {
        const res = await apiClient.get('/orders/');
        const r = res.data.results || res.data;
        return Array.isArray(r) ? r.map(transformApiOrder) : [];
      } catch (e) { console.error('Ошибка загрузки заказов:', e); return []; }
    },
    getById: async (id: string): Promise<Order | null> => {
      try { const res = await apiClient.get(`/orders/${id}/`); return transformApiOrder(res.data); }
      catch (e) { console.error('Ошибка загрузки заказа:', e); return null; }
    },
    create: async (carId: string, totalPrice: number, clientName?: string, clientPhone?: string): Promise<Order | null> => {
      try {
        const res = await apiClient.post('/orders/', {
          car_id: carId, total_price: totalPrice, client_name: clientName, client_phone: clientPhone,
        });
        return transformApiOrder(res.data);
      } catch (e) { console.error('Ошибка создания заказа:', e); return null; }
    },
    updateStatus: async (id: string, status: string): Promise<Order | null> => {
      try {
        const res = await apiClient.post(`/orders/${id}/update_status/`, { status });
        return transformApiOrder(res.data);
      } catch (e) { console.error('Ошибка обновления статуса:', e); return null; }
    },
  },

  subscriptions: {
    getAll: async (): Promise<Subscription[]> => {
      try {
        const res = await apiClient.get('/search-requests/');
        const r = res.data.results || res.data;
        return Array.isArray(r) ? r.map(transformApiSubscription) : [];
      } catch (e) { console.error('Ошибка загрузки подписок:', e); return []; }
    },
    create: async (sub: Omit<Subscription, 'id'>): Promise<Subscription | null> => {
      try {
        const res = await apiClient.post('/search-requests/', subscriptionPayload(sub));
        return transformApiSubscription(res.data);
      } catch (e) { console.error('Ошибка создания подписки:', e); return null; }
    },
    update: async (id: string, sub: Omit<Subscription, 'id'>): Promise<Subscription | null> => {
      try {
        const res = await apiClient.patch(`/search-requests/${id}/`, subscriptionPayload(sub));
        return transformApiSubscription(res.data);
      } catch (e) { console.error('Ошибка обновления подписки:', e); return null; }
    },
    delete: async (id: string): Promise<boolean> => {
      try { await apiClient.delete(`/search-requests/${id}/`); return true; }
      catch (e) { console.error('Ошибка удаления подписки:', e); return false; }
    },
  },

  orderHistory: {
    getForOrder: async (orderId: string): Promise<any[]> => {
      try {
        const res = await apiClient.get('/order-status-history/', { params: { order: orderId } });
        return res.data.results || res.data;
      } catch (e) { console.error('Ошибка загрузки истории заказа:', e); return []; }
    },
    create: async (data: { order_id: number; status: string; media_file?: File }): Promise<any | null> => {
      try {
        const formData = new FormData();
        formData.append('order_id', data.order_id.toString());
        formData.append('status', data.status);
        if (data.media_file) formData.append('media_file', data.media_file);
        const res = await apiClient.post('/order-status-history/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
      } catch (e) { console.error('Ошибка создания записи истории:', e); return null; }
    },
  },
};

// Подписка -> payload SearchRequest (id марки/группы — напрямую)
function subscriptionPayload(sub: Omit<Subscription, 'id'>) {
  return {
    brand_id: sub.brandId ?? null,
    model_group_id: sub.modelGroupId ?? null,
    year_min: sub.yearFrom,
    year_max: sub.yearTo,
    price_min: sub.priceRubFrom,
    price_max: sub.priceRubTo,
    mileage_min: sub.mileageFrom,
    mileage_max: sub.mileageTo,
    min_engine_volume: sub.engineVolumeFrom,
    max_engine_volume: sub.engineVolumeTo,
    fuel_type: sub.fuelType || null,
    transmission: sub.gearbox || null,
    body_type: sub.bodyType || null,
    colors: sub.color || null,
  };
}

export default api;
