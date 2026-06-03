import React, { useState, useEffect } from 'react';
import api from './services/api';
import { Car, Order, Subscription, SearchFilters, AppView, UserRole, Checkpoint } from './types';
import telegram from './telegram';

// Importing custom components
import HomeScreen from './components/HomeScreen';
import MakesSelector from './components/MakesSelector';
import ModelsSelector from './components/ModelsSelector';
import FiltersScreen from './components/FiltersScreen';
import ListingsScreen from './components/ListingsScreen';
import CarDetailsScreen from './components/CarDetailsScreen';
import OrderTrackerScreen from './components/OrderTrackerScreen';
import CheckpointPhotoScreen from './components/CheckpointPhotoScreen';
import SubscriptionsManager from './components/SubscriptionsManager';
import AdminCRM from './components/AdminCRM';


const DEFAULT_FILTERS: SearchFilters = {
  make: '',
  model: '',
  condition: 'all',
  yearFrom: '',
  yearTo: '',
  priceFrom: '',
  priceTo: '',
  engineVolumeFrom: '',
  engineVolumeTo: '',
  powerFrom: '',
  powerTo: '',
  fuelType: 'Все виды',
  gearbox: 'Все коробки',
  wheelPosition: 'Все варианты',
  driveType: 'Все приводы',
  color: 'Все цвета',
  country: 'Корея'
};

export default function App() {
  // Core application data states
  const [cars, setCars] = useState<Car[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  // Telegram user state
  const [telegramUser, setTelegramUser] = useState<any>(null);

  // Navigation and Interactive flow states
  const [activeRole, setActiveRole] = useState<UserRole>('client');
  const [activeView, setActiveView] = useState<AppView>('home');
  const [activeTab, setActiveTab] = useState<'orders' | 'subscriptions'>('orders');

  // Search parameters
  const [filters, setFilters] = useState<SearchFilters>({ ...DEFAULT_FILTERS });
  const [selectedBrand, setSelectedBrand] = useState('BMW');
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);


  // Load and populate data from API on initialization
  useEffect(() => {
    console.log('App initialization started');

    // Инициализация Telegram WebApp
    try {
      telegram.init();
      console.log('Telegram init called');
    } catch (e) {
      console.error('Telegram init error:', e);
    }

    // Проверка, что приложение запущено в Telegram
    if (telegram.isInTelegram()) {
      const user = telegram.getUser();
      console.log('Telegram User:', user);
      setTelegramUser(user);

      // Применить тему Telegram
      const webApp = telegram.getWebApp();
      if (webApp?.colorScheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    } else {
      console.log('Not running in Telegram');
    }

    // Загрузка данных из API
    const loadData = async () => {
      try {
        const [carsData, ordersData, subscriptionsData] = await Promise.all([
          api.cars.getAll(),
          api.orders.getAll(),
          api.subscriptions.getAll()
        ]);

        console.log('Data loaded from API:', {
          cars: carsData.length,
          orders: ordersData.length,
          subscriptions: subscriptionsData.length
        });

        setCars(carsData);
        setOrders(ordersData);
        setSubscriptions(subscriptionsData);
      } catch (error) {
        console.error('Error loading data from API:', error);
      }
    };

    loadData();
  }, []);

  // Sync state modifications to API automatically
  const updatePersistedData = async (newCars: Car[], newOrders: Order[], newSubs: Subscription[]) => {
    setCars(newCars);
    setOrders(newOrders);
    setSubscriptions(newSubs);
  };

  // State modification events handlers
  const handleAddCar = async (newCarItem: Car) => {
    const createdCar = await api.cars.create(newCarItem);
    if (createdCar) {
      const updatedCars = [createdCar, ...cars];
      updatePersistedData(updatedCars, orders, subscriptions);
    }
  };

  const handleDeleteCar = async (carId: string) => {
    const success = await api.cars.delete(carId);
    if (success) {
      const updatedCars = cars.filter(c => c.id !== carId);
      updatePersistedData(updatedCars, orders, subscriptions);
    }
  };

  const handleUpdateOrder = async (updatedOrder: Order) => {
    const result = await api.orders.updateStatus(updatedOrder.id, updatedOrder.status);
    if (result) {
      const updatedOrders = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
      updatePersistedData(cars, updatedOrders, subscriptions);
      setLatestOrdered(updatedOrder);
    }
  };

  const handleAddSubscription = async (make: string, model: string) => {
    // Avoid double subscribing
    const exists = subscriptions.some(s => s.make.toLowerCase() === make.toLowerCase() && s.model.toLowerCase() === model.toLowerCase());
    if (exists) return;

    const newSub = await api.subscriptions.create({
      make,
      model,
      yearFrom: 2017,
      yearTo: 2026
    });

    if (newSub) {
      const updatedSubs = [newSub, ...subscriptions];
      updatePersistedData(cars, orders, updatedSubs);
    }
  };

  const handleCreateFullSubscription = async (subData: Omit<Subscription, 'id'>) => {
    const newSub = await api.subscriptions.create(subData);
    if (newSub) {
      const updatedSubs = [newSub, ...subscriptions];
      updatePersistedData(cars, orders, updatedSubs);
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    const success = await api.subscriptions.delete(id);
    if (success) {
      const updatedSubs = subscriptions.filter(s => s.id !== id);
      updatePersistedData(cars, orders, updatedSubs);
    }
  };

  const handlePlaceOrder = async (name: string, phone: string) => {
    if (!selectedCarId) return;
    const selectedCar = cars.find(c => c.id === selectedCarId);
    if (!selectedCar) return;

    const newOrder = await api.orders.create(selectedCar.id, selectedCar.priceRub);

    if (newOrder) {
      const updatedOrders = [newOrder, ...orders];
      updatePersistedData(cars, updatedOrders, subscriptions);

      // Set active values for bot notifier trigger
      setSelectedOrderId(newOrder.id);

      // Redirect to success / thank you tracking node logs view
      setActiveView('order-tracking');
    }
  };


  // Interactive router layout rendering
  const renderClientView = () => {
    switch (activeView) {
      case 'home':
        return (
          <HomeScreen
            currentTab={activeTab}
            setTab={setActiveTab}
            orders={orders}
            subscriptions={subscriptions}
            popularCars={cars.slice(0, 4)}
            onOpenBrandSelector={() => setActiveView('makes-selector')}
            onOpenFilters={() => setActiveView('filters')}
            onViewOrder={(id) => {
              setSelectedOrderId(id);
              setActiveView('order-tracking');
            }}
            onDeleteSubscription={handleDeleteSubscription}
            onViewCarDetails={(id) => {
              setSelectedCarId(id);
              setActiveView('car-details');
            }}
            onOpenSubscriptions={() => setActiveView('subscriptions-list')}
          />
        );

      case 'makes-selector':
        return (
          <MakesSelector
            onBack={() => setActiveView('home')}
            onSelectBrand={(brand) => {
              if (brand) {
                setSelectedBrand(brand);
                setFilters(prev => ({ ...prev, make: brand, model: '' }));
                setActiveView('models-selector');
              } else {
                setFilters(prev => ({ ...prev, make: '', model: '' }));
                setActiveView('listings');
              }
            }}
            totalListingsCount={cars.length}
          />
        );

      case 'models-selector':
        return (
          <ModelsSelector
            brand={selectedBrand}
            onBack={() => setActiveView('makes-selector')}
            onSelectModel={(model) => {
              if (model) {
                setFilters(prev => ({ ...prev, model }));
              }
              setActiveView('listings');
            }}
            brandListingsCount={cars.filter(c => c.make === selectedBrand).length}
          />
        );

      case 'filters':
        return (
          <FiltersScreen
            initialFilters={filters}
            onBack={() => setActiveView('home')}
            catalog={cars}
            onApply={(updatedFilters) => {
              setFilters(updatedFilters);
              setActiveView('listings');
            }}
          />
        );

      case 'listings':
        return (
          <ListingsScreen
            catalog={cars}
            filters={filters}
            onBack={() => {
              setFilters({ ...DEFAULT_FILTERS });
              setActiveView('home');
            }}
            onOpenFilters={() => setActiveView('filters')}
            onSelectCar={(id) => {
              setSelectedCarId(id);
              setActiveView('car-details');
            }}
            onAddSubscription={handleAddSubscription}
            subscriptions={subscriptions}
          />
        );

      case 'car-details':
        const targetCar = cars.find(c => c.id === selectedCarId) || cars[0];
        return (
          <CarDetailsScreen
            car={targetCar}
            onBack={() => setActiveView('listings')}
            onPlaceOrder={handlePlaceOrder}
          />
        );

      case 'order-tracking':
        const targetOrder = orders.find(o => o.id === (selectedOrderId || (orders[0]?.id))) || orders[0];
        if (!targetOrder) {
          return (
            <div className="text-center py-10 space-y-3">
              <p className="text-sm text-slate-500">Заказы отсутствуют.</p>
              <button onClick={() => setActiveView('home')} className="bg-slate-900 text-white rounded-lg px-4 py-2 text-xs">Домой</button>
            </div>
          );
        }
        return (
          <OrderTrackerScreen
            order={targetOrder}
            onBack={() => setActiveView('home')}
            onViewCheckpointPhoto={(checkpoint) => {
              setSelectedCheckpoint(checkpoint);
              setActiveView('order-checkpoint-photo');
            }}
          />
        );

      case 'order-checkpoint-photo':
        if (!selectedCheckpoint) {
          return (
            <div className="text-center py-10">
              <p className="text-xs text-slate-400">Фото-отчет не выбран</p>
              <button onClick={() => setActiveView('home')} className="text-xs text-sky-500">Назад в трекинг</button>
            </div>
          );
        }
        return (
          <CheckpointPhotoScreen
            checkpoint={selectedCheckpoint}
            onBack={() => setActiveView('order-tracking')}
          />
        );

      case 'subscriptions-list':
        return (
          <SubscriptionsManager
            subscriptions={subscriptions}
            onBack={() => setActiveView('home')}
            onAddSub={handleCreateFullSubscription}
            onDeleteSub={handleDeleteSubscription}
          />
        );

      default:
        return <div>Элемент меню недоступен</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 select-none antialiased flex flex-col font-sans">

      {/* Main working playground space */}
      <main className="flex-1 w-full mx-auto p-4 md:p-6">

        {/* Dynamic screen output window */}
        <section className="w-full">

          {activeRole === 'client' ? (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm max-w-md mx-auto min-h-[640px] flex flex-col justify-between relative overflow-hidden">

              {/* Telegram App Bar Frame Mockup */}
              <div className="border-b border-stone-100 pb-3 mb-4 flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span className="text-slate-700 tracking-wide select-none flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Korea_MiniApp.web</span>
                </span>
                {telegramUser && (
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-700 leading-tight">
                        {telegramUser.first_name} {telegramUser.last_name || ''}
                      </div>
                      {telegramUser.username && (
                        <div className="text-[10px] text-slate-400 leading-tight">
                          @{telegramUser.username}
                        </div>
                      )}
                    </div>
                    <div className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {telegramUser.first_name?.[0] || 'U'}
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic screen element */}
              <div className="flex-1">
                {renderClientView()}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm min-h-[640px]">
              {/* CRM Manager administrative workspace */}
              <AdminCRM
                cars={cars}
                orders={orders}
                subscriptions={subscriptions}
                onAddCar={handleAddCar}
                onUpdateOrder={handleUpdateOrder}
                onDeleteCar={handleDeleteCar}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
