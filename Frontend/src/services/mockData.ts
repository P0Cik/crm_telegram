import { Car, Order, Subscription } from '../types';

export const INITIAL_CARS: Car[] = [
  {
    id: 'bmw-1s-2017-1',
    make: 'BMW',
    model: '1-series',
    year: 2017,
    priceWon: 23500000,
    priceRub: 1190000,
    images: [
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800'
    ],
    country: 'Корея',
    dateAdded: '2026-05-22',
    engineVolume: 1.5,
    fuelType: 'бензин',
    gearbox: 'робот',
    wheelPosition: 'правый',
    driveType: 'передний',
    color: 'белый',
    mileage: 29000,
    power: 136,
    vin: 'WBA1A11000HJ18274',
    isPopular: true
  },
  {
    id: 'bmw-1s-2017-2',
    make: 'BMW',
    model: '1-series',
    year: 2017,
    priceWon: 23500000,
    priceRub: 1190000,
    images: [
      'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=800'
    ],
    country: 'Корея',
    dateAdded: '2026-05-22',
    engineVolume: 1.5,
    fuelType: 'бензин',
    gearbox: 'робот',
    wheelPosition: 'правый',
    driveType: 'передний',
    color: 'черный',
    mileage: 29000,
    power: 136,
    vin: 'WBA1A11000HJ19385',
    isPopular: true
  },
  {
    id: 'audi-a4-2020',
    make: 'Audi',
    model: '3-series',
    year: 2020,
    priceWon: 35000000,
    priceRub: 2350000,
    images: [
      'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&q=80&w=800'
    ],
    country: 'Корея',
    dateAdded: '2026-05-20',
    engineVolume: 2.0,
    fuelType: 'дизель',
    gearbox: 'автомат',
    wheelPosition: 'левый',
    driveType: 'полный',
    color: 'серый',
    mileage: 45000,
    power: 190,
    vin: 'WAUZZZ8W1LC48291A',
    isPopular: false
  },
  {
    id: 'chevrolet-tb-2021',
    make: 'Chevrolet',
    model: '2-series',
    year: 2021,
    priceWon: 28000000,
    priceRub: 1750000,
    images: [
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800'
    ],
    country: 'Корея',
    dateAdded: '2026-05-18',
    engineVolume: 1.3,
    fuelType: 'бензин',
    gearbox: 'автомат',
    wheelPosition: 'левый',
    driveType: 'передний',
    color: 'красный',
    mileage: 38000,
    power: 150,
    vin: 'KL79HBTS6MB928372',
    isPopular: true
  },
  {
    id: 'geely-mon-2023',
    make: 'Geely',
    model: '5-series',
    year: 2023,
    priceWon: 42000000,
    priceRub: 3490000,
    images: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=800'
    ],
    country: 'Корея',
    dateAdded: '2026-05-28',
    engineVolume: 2.0,
    fuelType: 'бензин',
    gearbox: 'автомат',
    wheelPosition: 'левый',
    driveType: 'полный',
    color: 'черный',
    mileage: 12000,
    power: 238,
    vin: 'LBY7FAG15R8392817',
    isPopular: true
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: '12387',
    carId: 'bmw-1s-2017-1',
    carDetails: INITIAL_CARS[0],
    clientName: 'Боб Петров',
    clientPhone: '+7 (999) 123-4567',
    status: 'shipping',
    dateCreated: '2026-05-20',
    expectedDeliveryDate: '2 июня',
    checkpoints: [
      {
        id: 'cp5',
        statusText: 'В пути на склад (Россия)',
        date: '25 мая',
        imageUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=800',
        inspectorName: 'Мажурин Артем Дмитриевич',
        inspectionTime: '25.05.2026 14:15'
      },
      {
        id: 'cp4',
        statusText: 'Прошел границу',
        date: '24 мая',
        imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
        inspectorName: 'Мажурин Артем Дмитриевич',
        inspectionTime: '24.05.2026 23:04'
      },
      {
        id: 'cp3',
        statusText: 'В пути на границу',
        date: '23 мая',
        imageUrl: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=800',
        inspectorName: 'Пак Чжи Сон',
        inspectionTime: '23.05.2026 11:30'
      },
      {
        id: 'cp2',
        statusText: 'Прибыл на склад (Корея)',
        date: '22 мая',
        imageUrl: 'https://images.unsplash.com/photo-1520105072000-f44fc083e54c?auto=format&fit=crop&q=80&w=800',
        inspectorName: 'Ким Чен Ын (Инспектор)',
        inspectionTime: '22.05.2026 09:20'
      },
      {
        id: 'cp1',
        statusText: 'В пути на склад (Корея)',
        date: '21 мая',
        imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=800',
        inspectorName: 'Ли Сын У',
        inspectionTime: '21.05.2026 16:45'
      }
    ]
  }
];

export const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub-1',
    make: 'BMW',
    model: '1-series',
    yearFrom: 2015,
    yearTo: 2020,
    priceRubFrom: 1000000,
    priceRubTo: 2000000
  }
];

export const getStoredData = () => {
  const cars = localStorage.getItem('korea_crm_cars');
  const orders = localStorage.getItem('korea_crm_orders');
  const subscriptions = localStorage.getItem('korea_crm_subscriptions');

  return {
    cars: cars ? JSON.parse(cars) : INITIAL_CARS,
    orders: orders ? JSON.parse(orders) : INITIAL_ORDERS,
    subscriptions: subscriptions ? JSON.parse(subscriptions) : INITIAL_SUBSCRIPTIONS,
  };
};

export const saveStoredData = (data: { cars: Car[]; orders: Order[]; subscriptions: Subscription[] }) => {
  localStorage.setItem('korea_crm_cars', JSON.stringify(data.cars));
  localStorage.setItem('korea_crm_orders', JSON.stringify(data.orders));
  localStorage.setItem('korea_crm_subscriptions', JSON.stringify(data.subscriptions));
};
