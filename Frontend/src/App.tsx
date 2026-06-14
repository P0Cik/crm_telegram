import { useState, useEffect } from 'react';
import api from './services/api';
import authService from './services/auth';
import { Car, Order, Subscription, SearchFilters, AppView, UserRole, Checkpoint, FilterOptions, CatalogOption } from './types';
import telegram from './telegram';

import HomeScreen from './components/HomeScreen';
import MakesSelector from './components/MakesSelector';
import ModelsSelector from './components/ModelsSelector';
import FiltersScreen from './components/FiltersScreen';
import ListingsScreen from './components/ListingsScreen';
import CarDetailsScreen from './components/CarDetailsScreen';
import OrderTrackerScreen from './components/OrderTrackerScreen';
import CheckpointPhotoScreen from './components/CheckpointPhotoScreen';
import SubscriptionsManager from './components/SubscriptionsManager';
import EditSubscriptionScreen from './components/EditSubscriptionScreen';
import AdminCRM from './components/AdminCRM';

export const DEFAULT_FILTERS: SearchFilters = {
  make: '', brandId: null, model: '', modelGroupId: null,
  yearFrom: '', yearTo: '', priceFrom: '', priceTo: '',
  mileageFrom: '', mileageTo: '', engineVolumeFrom: '', engineVolumeTo: '',
  fuelType: '', transmission: '', bodyType: '', color: '', interiorColor: '',
  seatCount: '', sort: '',
};

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [popularCars, setPopularCars] = useState<Car[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);

  const [telegramUser, setTelegramUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  const [activeRole, setActiveRole] = useState<UserRole>('client');
  const [activeView, setActiveView] = useState<AppView>('home');
  const [activeTab, setActiveTab] = useState<'orders' | 'subscriptions'>('orders');

  const [filters, setFilters] = useState<SearchFilters>({ ...DEFAULT_FILTERS });
  const [selectedBrand, setSelectedBrand] = useState<CatalogOption | null>(null);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [previousView, setPreviousView] = useState<AppView>('home');
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);

  // --- Авторизация ---
  useEffect(() => {
    const init = async () => {
      try { telegram.init(); } catch (e) { console.error('Telegram init error:', e); }

      const isTelegram = telegram.isInTelegram();
      if (isTelegram) {
        setTelegramUser(telegram.getUser());
        const webApp = telegram.getWebApp();
        if (webApp?.colorScheme === 'dark') document.documentElement.classList.add('dark');
      }

      const authResult = await authService.authenticate();
      if (authResult?.success) {
        setIsAuthenticated(true);
        if (!isTelegram) setTelegramUser(authResult.user);
        setActiveRole(authResult.user.role === 'MANAGER' ? 'manager' : 'client');
      } else {
        setIsAuthenticated(false);
      }
      setIsAuthenticating(false);
    };
    init();
  }, []);

  // --- Загрузка данных ---
  const reloadOrders = async () => setOrders(await api.orders.getAll());
  const reloadSubscriptions = async () => setSubscriptions(await api.subscriptions.getAll());

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      try {
        const [ordersData, subsData, filtersData, popular] = await Promise.all([
          api.orders.getAll(),
          api.subscriptions.getAll(),
          api.cars.getFilters(),
          api.cars.search({ ...DEFAULT_FILTERS, sort: '-first_seen_at' }, 1, 12),
        ]);
        setOrders(ordersData);
        setSubscriptions(subsData);
        setFilterOptions(filtersData);
        setPopularCars(popular.results);
      } catch (e) { console.error('Ошибка загрузки данных:', e); }
    };
    load();
  }, [isAuthenticated]);

  // --- Подписки ---
  const resolveCatalogIds = (sub: Omit<Subscription, 'id'>): Omit<Subscription, 'id'> => {
    // Если id не заданы, пробуем найти по названию в каталоге фильтров
    let { brandId, modelGroupId } = sub;
    if (!brandId && sub.make && filterOptions) {
      const b = filterOptions.brands.find(x => x.name.toLowerCase() === sub.make.toLowerCase());
      brandId = b?.id ?? null;
    }
    if (!modelGroupId && sub.model && brandId && filterOptions) {
      const g = filterOptions.model_groups.find(
        x => x.name.toLowerCase() === sub.model.toLowerCase() && x.brand_id === brandId
      );
      modelGroupId = g?.id ?? null;
    }
    return { ...sub, brandId, modelGroupId };
  };

  const handleQuickSubscribe = async (f: SearchFilters) => {
    const exists = subscriptions.some(s =>
      (s.brandId ?? null) === (f.brandId ?? null) && (s.modelGroupId ?? null) === (f.modelGroupId ?? null)
    );
    if (exists) return true;
    const sub = await api.subscriptions.create({
      make: f.make, model: f.model, brandId: f.brandId, modelGroupId: f.modelGroupId,
      yearFrom: f.yearFrom ? parseInt(f.yearFrom) : undefined,
      yearTo: f.yearTo ? parseInt(f.yearTo) : undefined,
      priceRubFrom: f.priceFrom ? parseFloat(f.priceFrom) * 1_000_000 : undefined,
      priceRubTo: f.priceTo ? parseFloat(f.priceTo) * 1_000_000 : undefined,
      mileageFrom: f.mileageFrom ? parseInt(f.mileageFrom) : undefined,
      mileageTo: f.mileageTo ? parseInt(f.mileageTo) : undefined,
      engineVolumeFrom: f.engineVolumeFrom ? parseFloat(f.engineVolumeFrom) : undefined,
      engineVolumeTo: f.engineVolumeTo ? parseFloat(f.engineVolumeTo) : undefined,
      fuelType: f.fuelType || undefined,
      gearbox: f.transmission || undefined,
      bodyType: f.bodyType || undefined,
      color: f.color || undefined,
    });
    if (sub) setSubscriptions(prev => [sub, ...prev]);
    return Boolean(sub);
  };

  const handleCreateFullSubscription = async (subData: Omit<Subscription, 'id'>) => {
    const sub = await api.subscriptions.create(resolveCatalogIds(subData));
    if (sub) setSubscriptions(prev => [sub, ...prev]);
  };

  const handleUpdateSubscription = async (updated: Subscription) => {
    const result = await api.subscriptions.update(updated.id, resolveCatalogIds(updated));
    if (result) setSubscriptions(prev => prev.map(s => (s.id === result.id ? result : s)));
    setActiveView('home');
    setActiveTab('subscriptions');
  };

  const handleDeleteSubscription = async (id: string) => {
    if (await api.subscriptions.delete(id)) {
      setSubscriptions(prev => prev.filter(s => s.id !== id));
    }
  };

  // --- Заказы ---
  const handleUpdateOrder = async (updatedOrder: Order) => {
    const result = await api.orders.updateStatus(updatedOrder.id, updatedOrder.rawStatus || updatedOrder.status);
    if (result) setOrders(prev => prev.map(o => (o.id === result.id ? result : o)));
  };

  const handlePlaceOrder = async (name: string, phone: string) => {
    if (!selectedCar) return;
    const newOrder = await api.orders.create(selectedCar.id, selectedCar.priceRub, name, phone);
    if (newOrder) {
      setOrders(prev => [newOrder, ...prev]);
      setSelectedOrderId(newOrder.id);
      setActiveView('order-tracking');
    }
  };

  const openCarDetails = (car: Car, from: AppView) => {
    setSelectedCar(car);
    setPreviousView(from);
    setActiveView('car-details');
  };

  // --- Рендер клиентских экранов ---
  const renderClientView = () => {
    switch (activeView) {
      case 'home':
        return (
          <HomeScreen
            currentTab={activeTab}
            setTab={setActiveTab}
            orders={orders}
            subscriptions={subscriptions}
            popularCars={popularCars}
            onOpenBrandSelector={() => setActiveView('makes-selector')}
            onOpenFilters={() => setActiveView('filters')}
            onViewOrder={(id) => { setSelectedOrderId(id); setActiveView('order-tracking'); }}
            onDeleteSubscription={handleDeleteSubscription}
            onViewCarDetails={(car) => openCarDetails(car, 'home')}
            onOpenSubscriptions={() => setActiveView('subscriptions-list')}
            onEditSubscription={(id) => { setSelectedSubscriptionId(id); setActiveView('edit-subscription'); }}
          />
        );

      case 'makes-selector':
        return (
          <MakesSelector
            brands={filterOptions?.brands || []}
            total={filterOptions?.total || 0}
            onBack={() => setActiveView('home')}
            onSelectBrand={(brand) => {
              if (brand) {
                setSelectedBrand(brand);
                setFilters({ ...DEFAULT_FILTERS, make: brand.name, brandId: brand.id });
                setActiveView('models-selector');
              } else {
                setFilters({ ...DEFAULT_FILTERS });
                setActiveView('listings');
              }
            }}
          />
        );

      case 'models-selector': {
        const groups = (filterOptions?.model_groups || []).filter(g => g.brand_id === selectedBrand?.id);
        const brandTotal = (filterOptions?.brands || []).find(b => b.id === selectedBrand?.id)?.count || 0;
        return (
          <ModelsSelector
            brand={selectedBrand?.name || ''}
            groups={groups}
            brandListingsCount={brandTotal}
            onBack={() => setActiveView('makes-selector')}
            onSelectGroup={(group) => {
              setFilters(f => ({
                ...f,
                model: group?.name || '',
                modelGroupId: group?.id ?? null,
              }));
              setActiveView('listings');
            }}
          />
        );
      }

      case 'filters':
        return (
          <FiltersScreen
            initialFilters={filters}
            filterOptions={filterOptions}
            onBack={() => setActiveView('home')}
            onApply={(updated) => { setFilters(updated); setActiveView('listings'); }}
          />
        );

      case 'listings':
        return (
          <ListingsScreen
            filters={filters}
            filterOptions={filterOptions}
            subscriptions={subscriptions}
            onBack={() => { setFilters({ ...DEFAULT_FILTERS }); setActiveView('home'); }}
            onOpenFilters={() => setActiveView('filters')}
            onSelectCar={(car) => openCarDetails(car, 'listings')}
            onChangeFilters={setFilters}
            onSubscribe={() => handleQuickSubscribe(filters)}
          />
        );

      case 'car-details':
        if (!selectedCar) {
          return (
            <div className="text-center py-10 space-y-3">
              <p className="text-sm text-slate-500">Автомобиль не выбран.</p>
              <button onClick={() => setActiveView('home')} className="bg-slate-900 text-white rounded-lg px-4 py-2 text-xs">Домой</button>
            </div>
          );
        }
        return (
          <CarDetailsScreen
            car={selectedCar}
            onBack={() => setActiveView(previousView)}
            onPlaceOrder={handlePlaceOrder}
          />
        );

      case 'order-tracking': {
        const targetOrder = orders.find(o => o.id === (selectedOrderId || orders[0]?.id)) || orders[0];
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
            onViewCheckpointPhoto={(checkpoint) => { setSelectedCheckpoint(checkpoint); setActiveView('order-checkpoint-photo'); }}
          />
        );
      }

      case 'order-checkpoint-photo':
        if (!selectedCheckpoint) {
          return (
            <div className="text-center py-10">
              <p className="text-xs text-slate-400">Фото-отчёт не выбран</p>
              <button onClick={() => setActiveView('order-tracking')} className="text-xs text-sky-500">Назад в трекинг</button>
            </div>
          );
        }
        return <CheckpointPhotoScreen checkpoint={selectedCheckpoint} onBack={() => setActiveView('order-tracking')} />;

      case 'subscriptions-list':
        return (
          <SubscriptionsManager
            subscriptions={subscriptions}
            filterOptions={filterOptions}
            onBack={() => setActiveView('home')}
            onAddSub={handleCreateFullSubscription}
            onDeleteSub={handleDeleteSubscription}
            onEditSub={(id) => { setSelectedSubscriptionId(id); setActiveView('edit-subscription'); }}
          />
        );

      case 'edit-subscription': {
        const editingSub = subscriptions.find(s => s.id === selectedSubscriptionId);
        if (!editingSub) {
          return (
            <div className="text-center py-10 space-y-3">
              <p className="text-sm text-slate-500">Подписка не найдена.</p>
              <button onClick={() => setActiveView('home')} className="bg-slate-900 text-white rounded-lg px-4 py-2 text-xs">Домой</button>
            </div>
          );
        }
        return (
          <EditSubscriptionScreen
            subscription={editingSub}
            filterOptions={filterOptions}
            onBack={() => setActiveView('home')}
            onSave={handleUpdateSubscription}
          />
        );
      }

      default:
        return <div>Элемент меню недоступен</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 select-none antialiased flex flex-col font-sans">
      <main className="flex-1 w-full mx-auto p-4 md:p-6">
        <section className="w-full">
          {isAuthenticating ? (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm max-w-md mx-auto min-h-[640px] flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm text-slate-600">Авторизация...</p>
              </div>
            </div>
          ) : !isAuthenticated ? (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm max-w-md mx-auto min-h-[640px] flex items-center justify-center">
              <div className="text-center space-y-3">
                <p className="text-sm text-slate-600">Ошибка авторизации</p>
                <p className="text-xs text-slate-400">Пожалуйста, откройте приложение через Telegram</p>
              </div>
            </div>
          ) : activeRole === 'client' ? (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm max-w-md mx-auto min-h-[640px] flex flex-col justify-between relative overflow-hidden">
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
                        <div className="text-[10px] text-slate-400 leading-tight">@{telegramUser.username}</div>
                      )}
                    </div>
                    <div className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {telegramUser.first_name?.[0] || 'U'}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1">{renderClientView()}</div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm min-h-[640px]">
              <AdminCRM
                orders={orders}
                subscriptions={subscriptions}
                onUpdateOrder={handleUpdateOrder}
                onRefreshData={async () => { await reloadOrders(); await reloadSubscriptions(); }}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
