import axios, { AxiosError } from 'axios';
import type {
  Car,
  Order,
  Subscription,
  SearchFilters
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Интерфейсы для API ответов
interface ApiCar {
  vin: string;
  brand: { id: number; name: string };
  model: { id: number; name: string };
  year: number;
  fuel_type: string;
  engine_volume: number;
  engine_power: number;
  transmission: string;
  steering_wheel: string;
  drive_type: string;
  color: string;
  seller_country: string;
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
  model?: { id: number; name: string };
  year_min?: number;
  year_max?: number;
  price_min?: string;
  price_max?: string;
  status: string;
}

// Преобразователи данных из API в формат приложения
const transformApiCar = (apiCar: ApiCar): Car => ({
  id: apiCar.vin,
  make: apiCar.brand.name,
  model: apiCar.model.name,
  year: apiCar.year,
  priceWon: 0, // Будет заполнено из объявления
  priceRub: 0,
  images: [],
  country: apiCar.seller_country,
  dateAdded: new Date().toISOString(),
  engineVolume: apiCar.engine_volume,
  fuelType: apiCar.fuel_type.toLowerCase(),
  gearbox: apiCar.transmission || 'автомат',
  wheelPosition: apiCar.steering_wheel === 'LEFT' ? 'левый' : 'правый',
  driveType: apiCar.drive_type || 'полный',
  color: apiCar.color,
  mileage: 0,
  power: apiCar.engine_power,
  vin: apiCar.vin,
});

const transformApiOrder = (apiOrder: ApiOrder): Order => {
  const car = transformApiCar(apiOrder.car);

  return {
    id: apiOrder.id.toString(),
    carId: apiOrder.car.vin,
    carDetails: car,
    clientName: apiOrder.user?.first_name || 'Клиент',
    clientPhone: apiOrder.user?.phone || '',
    status: mapOrderStatus(apiOrder.status),
    dateCreated: new Date(apiOrder.created_at).toLocaleDateString('ru-RU'),
    expectedDeliveryDate: '15 июня',
    checkpoints: [],
  };
};

const transformApiSubscription = (apiSub: ApiSubscription): Subscription => ({
  id: apiSub.id.toString(),
  make: apiSub.brand?.name || '',
  model: apiSub.model?.name || '',
  yearFrom: apiSub.year_min,
  yearTo: apiSub.year_max,
  priceRubFrom: apiSub.price_min ? parseFloat(apiSub.price_min) : undefined,
  priceRubTo: apiSub.price_max ? parseFloat(apiSub.price_max) : undefined,
});

const mapOrderStatus = (status: string): 'dealing' | 'korea_warehouse' | 'shipping' | 'delivered' => {
  const statusMap: Record<string, 'dealing' | 'korea_warehouse' | 'shipping' | 'delivered'> = {
    'PROCESSING': 'dealing',
    'WAREHOUSE_KR': 'korea_warehouse',
    'IN_TRANSIT_BORDER': 'shipping',
    'AT_BORDER': 'shipping',
    'WAREHOUSE_RU': 'shipping',
    'IN_TRANSIT_RU': 'shipping',
    'DELIVERED': 'delivered',
  };
  return statusMap[status] || 'dealing';
};

// API методы
export const api = {
  // Автомобили
  cars: {
    getAll: async (): Promise<Car[]> => {
      try {
        const response = await apiClient.get('/cars/');
        return response.data.results.map(transformApiCar);
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

        if (filters.make) params.brand__name = filters.make;
        if (filters.model) params.model__name = filters.model;
        if (filters.yearFrom) params.year__gte = filters.yearFrom;
        if (filters.yearTo) params.year__lte = filters.yearTo;
        if (filters.fuelType && filters.fuelType !== 'Все виды') params.fuel_type = filters.fuelType;
        if (filters.color && filters.color !== 'Все цвета') params.color = filters.color;

        const response = await apiClient.get('/cars/', { params });
        return response.data.results.map(transformApiCar);
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
          engine_power: car.power,
          transmission: car.gearbox,
          color: car.color,
          seller_country: car.country,
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
        return response.data.results.map(transformApiOrder);
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

    create: async (carVin: string, totalPrice: number): Promise<Order | null> => {
      try {
        const response = await apiClient.post('/orders/', {
          car_vin: carVin,
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
        return response.data.results.map(transformApiSubscription);
      } catch (error) {
        console.error('Ошибка при загрузке подписок:', error);
        return [];
      }
    },

    create: async (subscription: Omit<Subscription, 'id'>): Promise<Subscription | null> => {
      try {
        const response = await apiClient.post('/search-requests/', {
          year_min: subscription.yearFrom,
          year_max: subscription.yearTo,
          price_min: subscription.priceRubFrom,
          price_max: subscription.priceRubTo,
        });
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
  },
};

export default api;
