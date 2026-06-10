import axios, { AxiosError } from 'axios';
import type {
  Car,
  Order,
  Subscription,
  SearchFilters
} from '../types';
import authService from './auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Добавляем JWT токен в каждый запрос
apiClient.interceptors.request.use((config) => {
  const token = authService.getAccessToken();

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  return config;
});

// Интерфейсы для API ответов
interface ApiCar {
  id: number;
  vin: string | null;
  brand: { id: number; name: string } | null;
  model_group?: { id: number; name: string } | null;
  model: { id: number; name: string } | null;
  badge?: string;
  year: number;
  fuel_type: string;
  fuel_type_display?: string;
  engine_volume: number | null;
  transmission: string;
  color: string;
  color_hex?: string;
  body_type?: string;
  sales_status?: string;
  sales_status_display?: string;
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

// Преобразователи данных из API в формат приложения
const transformApiCar = (apiCar: ApiCar): Car => ({
  id: String(apiCar.id),
  make: apiCar.brand?.name ?? '',
  model: apiCar.model?.name ?? apiCar.model_group?.name ?? '',
  modelGroup: apiCar.model_group?.name ?? '',
  year: apiCar.year,
  priceWon: apiCar.price_won ?? 0,
  priceRub: apiCar.price_rub ?? 0,
  images: apiCar.images ?? [],
  // Страна продавца: регион Кореи (страна источника — KR)
  country: apiCar.region || 'Южная Корея',
  dateAdded: new Date().toISOString(),
  engineVolume: apiCar.engine_volume ?? 0,
  fuelType: (apiCar.fuel_type_display || apiCar.fuel_type || '').toLowerCase(),
  gearbox: apiCar.transmission || '',
  color: apiCar.color || '',
  bodyType: apiCar.body_type || '',
  salesStatus: apiCar.sales_status_display || apiCar.sales_status || '',
  mileage: apiCar.mileage ?? 0,
  vin: apiCar.vin ?? '',
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
    dateCreated: new Date(apiOrder.created_at).toLocaleDateString('ru-RU'),
    expectedDeliveryDate: '15 июня',
    checkpoints: [],
  };
};

const transformApiSubscription = (apiSub: ApiSubscription): Subscription => {
  const transformed = {
    id: apiSub.id.toString(),
    make: apiSub.brand?.name || '',
    model: apiSub.model?.name || apiSub.model_group?.name || '',
    yearFrom: apiSub.year_min,
    yearTo: apiSub.year_max,
    priceRubFrom: apiSub.price_min ? parseFloat(apiSub.price_min) : undefined,
    priceRubTo: apiSub.price_max ? parseFloat(apiSub.price_max) : undefined,
    mileageFrom: apiSub.mileage_min,
    mileageTo: apiSub.mileage_max,
    engineVolumeFrom: apiSub.min_engine_volume ? parseFloat(apiSub.min_engine_volume) : undefined,
    engineVolumeTo: apiSub.max_engine_volume ? parseFloat(apiSub.max_engine_volume) : undefined,
    fuelType: apiSub.fuel_type,
    gearbox: apiSub.transmission,
    color: apiSub.colors,
  };

  return transformed;
};

const mapOrderStatus = (status: string): 'dealing' | 'korea_warehouse' | 'shipping' | 'delivered' => {
  const statusMap: Record<string, 'dealing' | 'korea_warehouse' | 'shipping' | 'delivered'> = {
    // Этап оформления/выкупа
    'REVIEW': 'dealing',
    'APPLICATION': 'dealing',
    'AWAITING_PAYMENT': 'dealing',
    'PURCHASE': 'dealing',
    // Склад в Корее
    'TO_WAREHOUSE_KR': 'korea_warehouse',
    'AT_WAREHOUSE_KR': 'korea_warehouse',
    'DOCUMENTS': 'korea_warehouse',
    'SHIPPING_PREP': 'korea_warehouse',
    // В пути
    'TO_BORDER': 'shipping',
    'CUSTOMS': 'shipping',
    'TO_WAREHOUSE_RU': 'shipping',
    'TO_DESTINATION': 'shipping',
    // Доставлен
    'DELIVERED': 'delivered',
  };
  return statusMap[status] || 'dealing';
};

// API методы
export const api = {
  // Бренды
  brands: {
    getAll: async (): Promise<Array<{ id: number; name: string }>> => {
      try {
        const response = await apiClient.get('/brands/');
        const results = response.data.results || response.data;
        return results;
      } catch (error) {
        console.error('Ошибка при загрузке брендов:', error);
        return [];
      }
    },
  },

  // Модели
  models: {
    getAll: async (): Promise<Array<{ id: number; name: string; brand: { id: number; name: string } }>> => {
      try {
        const response = await apiClient.get('/models/');
        const results = response.data.results || response.data;
        return results;
      } catch (error) {
        console.error('Ошибка при загрузке моделей:', error);
        return [];
      }
    },

    getByBrand: async (brandId: number): Promise<Array<{ id: number; name: string }>> => {
      try {
        const response = await apiClient.get('/models/', { params: { brand: brandId } });
        return response.data.results || response.data;
      } catch (error) {
        console.error('Ошибка при загрузке моделей бренда:', error);
        return [];
      }
    },
  },

  // Автомобили
  cars: {
    getFilters: async (): Promise<any> => {
      try {
        const response = await apiClient.get('/cars/filters/');
        return response.data;
      } catch (error) {
        console.error('Ошибка при загрузке фильтров:', error);
        return null;
      }
    },

    getAll: async (): Promise<Car[]> => {
      try {
        const response = await apiClient.get('/cars/');
        const results = response.data.results || response.data;
        return Array.isArray(results) ? results.map(transformApiCar) : [];
      } catch (error) {
        console.error('Ошибка при загрузке автомобилей:', error);
        return [];
      }
    },

    getById: async (vin: string): Promise<Car | null> => {
      try {
        const response = await apiClient.get(`/cars/${vin}/`);
        return transformApiCar(response.data);
      } catch (error) {
        console.error('Ошибка при загрузке автомобиля:', error);
        return null;
      }
    },

    search: async (filters: SearchFilters): Promise<Car[]> => {
      try {
        const params: any = {};

        if (filters.make && !['Все марки', 'Любая марка', ''].includes(filters.make)) params.brand_name = filters.make;
        if (filters.model && !['Все модели', 'Любая модель', ''].includes(filters.model)) params.model_name = filters.model;
        if (filters.yearFrom) params.year_min = filters.yearFrom;
        if (filters.yearTo) params.year_max = filters.yearTo;
        if (filters.fuelType && filters.fuelType !== 'Все виды') {
            const fuelMap: Record<string, string> = {
                'бензин': 'PETROL',
                'дизель': 'DIESEL',
                'гибрид': 'HYBRID',
                'электро': 'ELECTRIC',
                'газ': 'LPG'
            };
            params.fuel_type = fuelMap[filters.fuelType.toLowerCase()] || filters.fuelType;
        }
        if (filters.color && filters.color !== 'Все цвета') {
            const colorMap: Record<string, string> = {
                'белый': 'Белый',
                'черный': 'Чёрный',
                'серый': 'Серый',
                'синий': 'Синий',
                'красный': 'Красный'
            };
            params.color = colorMap[filters.color.toLowerCase()] || filters.color;
        }
        if (filters.gearbox && filters.gearbox !== 'Все коробки') params.transmission = filters.gearbox;
        if (filters.priceFrom) params.price_min = parseFloat(filters.priceFrom) * 1000000;
        if (filters.priceTo) params.price_max = parseFloat(filters.priceTo) * 1000000;

        const response = await apiClient.get('/cars/', { params });
        const results = response.data.results || response.data;
        return Array.isArray(results) ? results.map(transformApiCar) : [];
      } catch (error) {
        console.error('Ошибка при поиске автомобилей:', error);
        return [];
      }
    },

    create: async (car: Partial<Car>): Promise<Car | null> => {
      try {
        const response = await apiClient.post('/cars/', {
          vin: car.vin,
          year: car.year,
          fuel_type: car.fuelType?.toUpperCase(),
          engine_volume: car.engineVolume,
          transmission: car.gearbox,
          color: car.color,
        });
        return transformApiCar(response.data);
      } catch (error) {
        console.error('Ошибка при создании автомобиля:', error);
        return null;
      }
    },

    delete: async (vin: string): Promise<boolean> => {
      try {
        await apiClient.delete(`/cars/${vin}/`);
        return true;
      } catch (error) {
        console.error('Ошибка при удалении автомобиля:', error);
        return false;
      }
    },
  },

  // Заказы
  orders: {
    getAll: async (): Promise<Order[]> => {
      try {
        const response = await apiClient.get('/orders/');
        const results = response.data.results || response.data;
        return Array.isArray(results) ? results.map(transformApiOrder) : [];
      } catch (error) {
        console.error('Ошибка при загрузке заказов:', error);
        return [];
      }
    },

    getById: async (id: string): Promise<Order | null> => {
      try {
        const response = await apiClient.get(`/orders/${id}/`);
        return transformApiOrder(response.data);
      } catch (error) {
        console.error('Ошибка при загрузке заказа:', error);
        return null;
      }
    },

    create: async (carId: string, totalPrice: number): Promise<Order | null> => {
      try {
        const response = await apiClient.post('/orders/', {
          car_id: carId,
          total_price: totalPrice,
        });
        return transformApiOrder(response.data);
      } catch (error) {
        console.error('Ошибка при создании заказа:', error);
        return null;
      }
    },

    updateStatus: async (id: string, status: string): Promise<Order | null> => {
      try {
        const response = await apiClient.post(`/orders/${id}/update_status/`, {
          status,
        });
        return transformApiOrder(response.data);
      } catch (error) {
        console.error('Ошибка при обновлении статуса заказа:', error);
        return null;
      }
    },
  },

  // Подписки
  subscriptions: {
    getAll: async (): Promise<Subscription[]> => {
      try {
        const response = await apiClient.get('/search-requests/');
        const results = response.data.results || response.data;
        return Array.isArray(results) ? results.map(transformApiSubscription) : [];
      } catch (error) {
        console.error('Ошибка при загрузке подписок:', error);
        return [];
      }
    },

    create: async (subscription: Omit<Subscription, 'id'>): Promise<Subscription | null> => {
      try {
        // Получаем фильтры для корректного непагинированного поиска ID
        const filters = await api.cars.getFilters();
        const brands = filters?.brands || [];
        const models = filters?.models || [];

        // Находим brand_id по названию
        const isValidMake = subscription.make && !['Все марки', 'Любая марка', ''].includes(subscription.make);
        const brand = isValidMake ? brands.find((b: any) => b.name.toLowerCase() === subscription.make.toLowerCase()) : undefined;
        if (isValidMake && !brand) {
          console.error(`Бренд "${subscription.make}" не найден`);
          return null;
        }

        // Находим model_id по названию и brand_id
        const isValidModel = subscription.model && !['Все модели', 'Любая модель', ''].includes(subscription.model);
        const model = (isValidModel && brand) ? models.find((m: any) =>
          m.name.toLowerCase() === subscription.model.toLowerCase() &&
          m.brand_id === brand.id
        ) : undefined;
        if (isValidModel && !model) {
          console.error(`Модель "${subscription.model}" не найдена для бренда "${subscription.make}"`);
          return null;
        }

        const requestData = {
          brand_id: brand?.id,
          model_id: model?.id,
          year_min: subscription.yearFrom,
          year_max: subscription.yearTo,
          price_min: subscription.priceRubFrom,
          price_max: subscription.priceRubTo,
          mileage_min: subscription.mileageFrom,
          mileage_max: subscription.mileageTo,
          min_engine_volume: subscription.engineVolumeFrom,
          max_engine_volume: subscription.engineVolumeTo,
          fuel_type: subscription.fuelType,
          transmission: subscription.gearbox,
          colors: subscription.color,
        };

        const response = await apiClient.post('/search-requests/', requestData);
        return transformApiSubscription(response.data);
      } catch (error) {
        console.error('Ошибка при создании подписки:', error);
        return null;
      }
    },

    delete: async (id: string): Promise<boolean> => {
      try {
        await apiClient.delete(`/search-requests/${id}/`);
        return true;
      } catch (error) {
        console.error('Ошибка при удалении подписки:', error);
        return false;
      }
    },

    update: async (id: string, subscription: Omit<Subscription, 'id'>): Promise<Subscription | null> => {
      try {
        // Получаем фильтры для корректного непагинированного поиска ID
        const filters = await api.cars.getFilters();
        const brands = filters?.brands || [];
        const models = filters?.models || [];

        // Находим brand_id по названию
        const isValidMake = subscription.make && !['Все марки', 'Любая марка', ''].includes(subscription.make);
        const brand = isValidMake ? brands.find((b: any) => b.name.toLowerCase() === subscription.make.toLowerCase()) : undefined;
        if (isValidMake && !brand) {
          console.error(`Бренд "${subscription.make}" не найден`);
          return null;
        }

        // Находим model_id по названию и brand_id
        const isValidModel = subscription.model && !['Все модели', 'Любая модель', ''].includes(subscription.model);
        const model = (isValidModel && brand) ? models.find((m: any) =>
          m.name.toLowerCase() === subscription.model.toLowerCase() &&
          m.brand_id === brand.id
        ) : undefined;
        if (isValidModel && !model) {
          console.error(`Модель "${subscription.model}" не найдена для бренда "${subscription.make}"`);
          return null;
        }

        const requestData = {
          brand_id: brand?.id,
          model_id: model?.id,
          year_min: subscription.yearFrom,
          year_max: subscription.yearTo,
          price_min: subscription.priceRubFrom,
          price_max: subscription.priceRubTo,
          mileage_min: subscription.mileageFrom,
          mileage_max: subscription.mileageTo,
          min_engine_volume: subscription.engineVolumeFrom,
          max_engine_volume: subscription.engineVolumeTo,
          fuel_type: subscription.fuelType,
          transmission: subscription.gearbox,
          colors: subscription.color,
        };

        const response = await apiClient.patch(`/search-requests/${id}/`, requestData);
        return transformApiSubscription(response.data);
      } catch (error) {
        console.error('Ошибка при обновлении подписки:', error);
        return null;
      }
    },
  },


  // История статусов заказов
  orderHistory: {
    getForOrder: async (orderId: string): Promise<any[]> => {
      try {
        const response = await apiClient.get('/order-status-history/', {
          params: { order: orderId }
        });
        return response.data.results || response.data;
      } catch (error) {
        console.error('Ошибка при загрузке истории заказа:', error);
        return [];
      }
    },

    create: async (data: {
      order_id: number;
      status: string;
      media_file?: File;
    }): Promise<any | null> => {
      try {
        const formData = new FormData();
        formData.append('order_id', data.order_id.toString());
        formData.append('status', data.status);
        if (data.media_file) {
          formData.append('media_file', data.media_file);
        }

        const response = await apiClient.post('/order-status-history/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data;
      } catch (error) {
        console.error('Ошибка при создании записи истории:', error);
        return null;
      }
    },
  },
};

export default api;

