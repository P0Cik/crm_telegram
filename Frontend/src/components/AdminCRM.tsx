import React, { useState, useEffect, useRef } from 'react';
import {
  Briefcase, Package, PlusCircle,
  Trash2, RefreshCcw, FileText, CheckCircle2,
  Upload, Image, X, Search, ChevronLeft, Plus, Eye
} from 'lucide-react';
import { Car, Order, Subscription } from '../types';
import api from '../services/api';

interface AdminCRMProps {
  cars: Car[];
  orders: Order[];
  subscriptions: Subscription[];
  onAddCar: (car: Car) => void;
  onUpdateOrder: (updatedOrder: Order) => void;
  onDeleteCar: (id: string) => void;
  onRefreshData?: () => void;
}

// Маппинг статусов бэкенда для отображения
const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  'PROCESSING': { label: 'В обработке', color: 'bg-yellow-100 text-yellow-800' },
  'WAREHOUSE_KR': { label: 'Склад Корея', color: 'bg-blue-100 text-blue-800' },
  'IN_TRANSIT_BORDER': { label: 'В пути на границу', color: 'bg-indigo-100 text-indigo-800' },
  'AT_BORDER': { label: 'На границе', color: 'bg-purple-100 text-purple-800' },
  'WAREHOUSE_RU': { label: 'Склад Россия', color: 'bg-cyan-100 text-cyan-800' },
  'IN_TRANSIT_RU': { label: 'В пути по России', color: 'bg-teal-100 text-teal-800' },
  'DELIVERED': { label: 'Доставлен', color: 'bg-green-100 text-green-800' },
  'CANCELLED': { label: 'Отменён', color: 'bg-red-100 text-red-800' },
};

const STATUS_FLOW = [
  'PROCESSING',
  'WAREHOUSE_KR',
  'IN_TRANSIT_BORDER',
  'AT_BORDER',
  'WAREHOUSE_RU',
  'IN_TRANSIT_RU',
  'DELIVERED',
];

export default function AdminCRM({
  cars,
  orders,
  subscriptions,
  onAddCar,
  onUpdateOrder,
  onDeleteCar,
  onRefreshData,
}: AdminCRMProps) {
  type CrmViewType = 'orders-list' | 'order-detail' | 'create-order' | 'add-car' | 'listings' | 'advertisements';
  const [crmView, setCrmView] = useState<CrmViewType>('orders-list');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Brands/Models from API
  const [brands, setBrands] = useState<Array<{ id: number; name: string }>>([]);
  const [models, setModels] = useState<Array<{ id: number; name: string; brand: { id: number; name: string } }>>([]);
  const [filteredModels, setFilteredModels] = useState<Array<{ id: number; name: string }>>([]);

  // New Car form
  const [newCar, setNewCar] = useState({
    vin: '', brand_id: 0, model_id: 0, year: 2024, fuel_type: 'PETROL',
    engine_volume: 2.0, engine_power: 150, transmission: 'автомат',
    steering_wheel: 'LEFT', drive_type: 'передний', color: 'черный', seller_country: 'Южная Корея',
  });

  // Advertisement form
  const [advertisements, setAdvertisements] = useState<any[]>([]);
  const [newAd, setNewAd] = useState({ car_vin: '', car_price: 2000000, mileage: 30000, condition: 'Отличное' });

  // Order detail view
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Create order form
  const [newOrderVin, setNewOrderVin] = useState('');
  const [newOrderPrice, setNewOrderPrice] = useState(2000000);

  // Photo upload for checkpoint (inside order detail)
  const [historyStatus, setHistoryStatus] = useState<string>('PROCESSING');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Catalog search/filter
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogBrandFilter, setCatalogBrandFilter] = useState('');
  const [catalogYearFrom, setCatalogYearFrom] = useState('');
  const [catalogYearTo, setCatalogYearTo] = useState('');

  const showToast = (txt: string) => {
    setToastMessage(txt);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load brands and models on mount
  useEffect(() => {
    const loadBrandsModels = async () => {
      const [brandsData, modelsData] = await Promise.all([
        api.brands.getAll(),
        api.models.getAll(),
      ]);
      setBrands(brandsData);
      setModels(modelsData);
      if (brandsData.length > 0) {
        setNewCar(prev => ({ ...prev, brand_id: brandsData[0].id }));
        const filtered = modelsData.filter(m => m.brand.id === brandsData[0].id);
        setFilteredModels(filtered);
        if (filtered.length > 0) setNewCar(prev => ({ ...prev, model_id: filtered[0].id }));
      }
    };
    loadBrandsModels();
  }, []);

  useEffect(() => {
    if (crmView === 'advertisements') loadAdvertisements();
  }, [crmView]);

  const loadAdvertisements = async () => {
    setIsLoading(true);
    setAdvertisements(await api.advertisements.getAll());
    setIsLoading(false);
  };

  const handleBrandChange = (brandId: number) => {
    setNewCar(prev => ({ ...prev, brand_id: brandId, model_id: 0 }));
    const filtered = models.filter(m => m.brand.id === brandId);
    setFilteredModels(filtered);
    if (filtered.length > 0) setNewCar(prev => ({ ...prev, model_id: filtered[0].id }));
  };

  // ===== Handlers =====
  const handleCreateCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCar.vin || newCar.vin.length !== 17) { showToast('❌ VIN должен содержать 17 символов'); return; }
    setIsLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/cars/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify({
          vin: newCar.vin, brand_id: newCar.brand_id, model_id: newCar.model_id,
          year: newCar.year, fuel_type: newCar.fuel_type, engine_volume: newCar.engine_volume,
          engine_power: newCar.engine_power, transmission: newCar.transmission,
          steering_wheel: newCar.steering_wheel, drive_type: newCar.drive_type,
          color: newCar.color, seller_country: newCar.seller_country,
        }),
      });
      if (resp.ok) { showToast('🚗 Автомобиль добавлен!'); onRefreshData?.(); setCrmView('listings'); }
      else { const err = await resp.json(); showToast(`❌ ${JSON.stringify(err)}`); }
    } catch { showToast('❌ Ошибка при создании'); }
    setIsLoading(false);
  };

  const handleCreateAdvertisement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await api.advertisements.create(newAd);
    if (result) {
      showToast('📢 Объявление создано!');
      loadAdvertisements();
      const matchedCar = cars.find(c => c.vin === newAd.car_vin);
      if (matchedCar) {
        const matches = subscriptions.filter(s =>
          s.make.toLowerCase() === matchedCar.make.toLowerCase() &&
          s.model.toLowerCase() === matchedCar.model.toLowerCase()
        );
        if (matches.length > 0) showToast(`🔔 Найдено ${matches.length} совпадений с подписками!`);
      }
    } else showToast('❌ Ошибка');
    setIsLoading(false);
  };

  const handleChangeOrderStatus = async (orderId: string, nextStatus: string) => {
    setIsLoading(true);
    const result = await api.orders.updateStatus(orderId, nextStatus);
    if (result) {
      showToast(`📦 Статус изменён на "${ORDER_STATUS_MAP[nextStatus]?.label || nextStatus}"`);
      onRefreshData?.();
    } else showToast('❌ Ошибка');
    setIsLoading(false);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderVin) { showToast('⚠️ Выберите автомобиль'); return; }
    setIsLoading(true);
    const result = await api.orders.create(newOrderVin, newOrderPrice);
    if (result) {
      showToast('✅ Заказ создан!');
      onRefreshData?.();
      setCrmView('orders-list');
    } else showToast('❌ Ошибка при создании заказа');
    setIsLoading(false);
  };

  // File handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddPhotoReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    setIsLoading(true);
    const result = await api.orderHistory.create({
      order_id: parseInt(selectedOrderId),
      status: historyStatus,
      media_file: photoFile || undefined,
    });
    if (result) { showToast('📸 Фото-отчёт добавлен!'); clearPhoto(); }
    else showToast('❌ Ошибка');
    setIsLoading(false);
  };

  const getBackendStatus = (order: Order): string => {
    const map: Record<string, string> = {
      'dealing': 'PROCESSING', 'korea_warehouse': 'WAREHOUSE_KR',
      'shipping': 'IN_TRANSIT_BORDER', 'delivered': 'DELIVERED',
    };
    return map[order.status] || 'PROCESSING';
  };

  // Catalog filtering
  const filteredCars = cars.filter(c => {
    const searchLower = catalogSearch.toLowerCase();
    const matchesSearch = !catalogSearch ||
      c.make.toLowerCase().includes(searchLower) ||
      c.model.toLowerCase().includes(searchLower) ||
      c.vin.toLowerCase().includes(searchLower) ||
      c.color.toLowerCase().includes(searchLower);
    const matchesBrand = !catalogBrandFilter || c.make === catalogBrandFilter;
    const matchesYearFrom = !catalogYearFrom || c.year >= parseInt(catalogYearFrom);
    const matchesYearTo = !catalogYearTo || c.year <= parseInt(catalogYearTo);
    return matchesSearch && matchesBrand && matchesYearFrom && matchesYearTo;
  });

  // Get unique brands from cars for filter
  const uniqueBrands = [...new Set(cars.map(c => c.make))].sort();

  // Selected order for detail view
  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  // Check if we're in a sub-view (hide tabs)
  const isSubView = crmView === 'order-detail' || crmView === 'create-order';

  return (
    <div className="space-y-6 pb-20">
      {/* Tab header — hidden when in sub-view */}
      {!isSubView && (
        <div className="flex flex-col sm:flex-row bg-slate-900 text-white rounded-2xl p-2.5 items-center justify-between shadow border border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-sky-400" />
            <span className="font-extrabold text-sm tracking-tight font-sans">Korea Auto CRM</span>
          </div>
          <div className="flex flex-wrap bg-slate-800 p-1 rounded-xl gap-1">
            {(['orders-list', 'add-car', 'advertisements', 'listings'] as CrmViewType[]).map(v => {
              const labels: Record<string, string> = {
                'orders-list': 'Заказы', 'add-car': '+ Авто', 'advertisements': 'Объявления', 'listings': 'Каталог',
              };
              return (
                <button key={v} onClick={() => setCrmView(v)}
                  className={`text-[10px] uppercase font-bold tracking-wider font-mono py-1.5 px-3 rounded-lg transition ${
                    crmView === v ? 'bg-slate-700 text-sky-400' : 'text-slate-400 hover:text-white'
                  }`}
                >{labels[v]}</button>
              );
            })}
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="bg-emerald-900 border border-emerald-800 text-white px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 ml-2">Загрузка...</span>
        </div>
      )}

      {/* ===== ORDERS LIST ===== */}
      {crmView === 'orders-list' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">Заказы ({orders.length})</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCrmView('create-order')}
                className="flex items-center gap-1 bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg transition uppercase font-mono"
              >
                <Plus className="w-3 h-3" /> Новый заказ
              </button>
              {onRefreshData && (
                <button onClick={onRefreshData} className="text-slate-400 hover:text-sky-500 transition p-1">
                  <RefreshCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="bg-slate-50 border border-dashed text-center py-8 rounded-xl text-slate-500 text-xs">
              Нет заказов
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => {
                const bs = getBackendStatus(o);
                const si = ORDER_STATUS_MAP[bs] || { label: o.status, color: 'bg-gray-100 text-gray-800' };
                return (
                  <button
                    key={o.id}
                    onClick={() => { setSelectedOrderId(o.id); setHistoryStatus(bs); setCrmView('order-detail'); }}
                    className="w-full text-left bg-white border border-slate-150 rounded-2xl p-4 shadow-sm hover:border-sky-300 hover:shadow-md transition space-y-1"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900">Заказ №{o.id}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${si.color}`}>{si.label}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Клиент: <strong className="text-slate-700">{o.clientName}</strong></p>
                        <p className="text-[11px] text-slate-400 font-mono">{o.carDetails.make} {o.carDetails.model} ({o.carDetails.year})</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Сумма</span>
                        <span className="font-black text-slate-950 font-mono text-sm">
                          {o.carDetails.priceRub > 0 ? `${o.carDetails.priceRub.toLocaleString()} ₽` : '—'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-sky-500 font-semibold pt-1">
                      <Eye className="w-3 h-3" /> Открыть
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== CREATE ORDER ===== */}
      {crmView === 'create-order' && (
        <div className="space-y-4">
          <button onClick={() => setCrmView('orders-list')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-sky-500 transition font-semibold">
            <ChevronLeft className="w-4 h-4" /> Назад к заказам
          </button>

          <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 font-sans flex items-center gap-1.5">
              <PlusCircle className="text-sky-500 w-4 h-4" /> Создать заказ
            </h3>

            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs font-sans">
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Автомобиль</label>
                <select required value={newOrderVin} onChange={(e) => setNewOrderVin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-3 outline-none">
                  <option value="">-- Выберите авто --</option>
                  {cars.map(c => (
                    <option key={c.vin} value={c.vin}>{c.make} {c.model} ({c.year}) — {c.vin}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Сумма заказа (₽)</label>
                <input type="number" required value={newOrderPrice}
                  onChange={(e) => setNewOrderPrice(parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 outline-none" />
              </div>
              <button type="submit" disabled={isLoading}
                className="w-full bg-[#050b14] hover:bg-[#111e2f] text-white font-bold py-3.5 rounded-xl uppercase font-mono text-[10px] tracking-wider transition shadow disabled:opacity-50">
                {isLoading ? 'Создание...' : 'Создать заказ'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== ORDER DETAIL ===== */}
      {crmView === 'order-detail' && selectedOrder && (() => {
        const bs = getBackendStatus(selectedOrder);
        const si = ORDER_STATUS_MAP[bs] || { label: selectedOrder.status, color: 'bg-gray-100 text-gray-800' };
        return (
          <div className="space-y-5">
            <button onClick={() => setCrmView('orders-list')}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-sky-500 transition font-semibold">
              <ChevronLeft className="w-4 h-4" /> Назад к заказам
            </button>

            {/* Order info card */}
            <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-base text-slate-900">Заказ №{selectedOrder.id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${si.color}`}>{si.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Клиент: <strong className="text-slate-700">{selectedOrder.clientName}</strong></p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {selectedOrder.carDetails.make} {selectedOrder.carDetails.model} ({selectedOrder.carDetails.year})
                  </p>
                  <p className="text-[10px] text-slate-300 font-mono">VIN: {selectedOrder.carDetails.vin}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Сумма</span>
                  <span className="font-black text-slate-950 font-mono text-lg">
                    {selectedOrder.carDetails.priceRub > 0 ? `${selectedOrder.carDetails.priceRub.toLocaleString()} ₽` : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">от {selectedOrder.dateCreated}</span>
                </div>
              </div>
            </div>

            {/* Status change */}
            <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm space-y-3">
              <span className="text-[10px] text-slate-400 font-mono uppercase font-black block">Сменить этап доставки:</span>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 font-sans">
                {STATUS_FLOW.map((st) => (
                  <button key={st} onClick={() => handleChangeOrderStatus(selectedOrder.id, st)} disabled={isLoading}
                    className={`py-2 px-1 text-[9px] font-bold rounded-lg transition border ${
                      bs === st ? 'bg-sky-50 border-sky-400 text-sky-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}>
                    {ORDER_STATUS_MAP[st]?.label || st}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo report form */}
            <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-4">
              <h3 className="font-bold text-sm text-slate-800 font-sans flex items-center gap-1.5">
                <PlusCircle className="text-sky-500 w-4 h-4" /> Добавить фото-отчёт
              </h3>

              <form onSubmit={handleAddPhotoReport} className="space-y-3 text-xs font-sans">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Статус этапа</label>
                  <select value={historyStatus} onChange={(e) => setHistoryStatus(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-3 text-slate-800 outline-none">
                    {STATUS_FLOW.map(st => (
                      <option key={st} value={st}>{ORDER_STATUS_MAP[st]?.label || st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Фото</label>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

                  {!photoPreview ? (
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-300 rounded-xl py-6 flex flex-col items-center gap-2 hover:border-sky-400 hover:bg-sky-50/30 transition cursor-pointer">
                      <Upload className="w-8 h-8 text-slate-400" />
                      <span className="text-slate-500 text-xs">Нажмите для выбора фото</span>
                      <span className="text-slate-400 text-[10px]">или сделайте снимок с камеры</span>
                    </button>
                  ) : (
                    <div className="relative">
                      <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl border border-slate-200" />
                      <button type="button" onClick={clearPhoto}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition">
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-lg flex items-center gap-1">
                        <Image className="w-3 h-3" />{photoFile?.name}
                      </div>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={isLoading}
                  className="w-full bg-[#050b14] hover:bg-[#111e2f] text-white font-bold py-3.5 rounded-xl uppercase font-mono text-[10px] tracking-wider transition shadow disabled:opacity-50">
                  {isLoading ? 'Загрузка...' : 'Опубликовать фото-отчёт'}
                </button>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ===== ADD CAR ===== */}
      {crmView === 'add-car' && (
        <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-800 font-sans">Добавить автомобиль в базу</h3>
          <form onSubmit={handleCreateCar} className="space-y-3.5 text-xs font-sans">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Марка</label>
                <select value={newCar.brand_id} onChange={(e) => handleBrandChange(parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5">
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Модель</label>
                <select value={newCar.model_id} onChange={(e) => setNewCar(p => ({ ...p, model_id: parseInt(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5">
                  {filteredModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">VIN (17 символов)</label>
              <input type="text" required maxLength={17} value={newCar.vin}
                onChange={(e) => setNewCar(p => ({ ...p, vin: e.target.value.toUpperCase() }))}
                placeholder="WBA1A1C35JK123456"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 font-mono uppercase" />
              <span className={`text-[10px] mt-0.5 block ${newCar.vin.length === 17 ? 'text-green-500' : 'text-slate-400'}`}>
                {newCar.vin.length}/17
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Год</label>
                <input type="number" required value={newCar.year}
                  onChange={(e) => setNewCar(p => ({ ...p, year: parseInt(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Двигатель (л)</label>
                <input type="number" step="0.1" value={newCar.engine_volume}
                  onChange={(e) => setNewCar(p => ({ ...p, engine_volume: parseFloat(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Мощность</label>
                <input type="number" value={newCar.engine_power}
                  onChange={(e) => setNewCar(p => ({ ...p, engine_power: parseInt(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Топливо</label>
                <select value={newCar.fuel_type} onChange={(e) => setNewCar(p => ({ ...p, fuel_type: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5">
                  <option value="PETROL">Бензин</option><option value="DIESEL">Дизель</option>
                  <option value="HYBRID">Гибрид</option><option value="ELECTRIC">Электро</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Руль</label>
                <select value={newCar.steering_wheel} onChange={(e) => setNewCar(p => ({ ...p, steering_wheel: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5">
                  <option value="LEFT">Левый</option><option value="RIGHT">Правый</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Цвет</label>
                <input type="text" value={newCar.color} onChange={(e) => setNewCar(p => ({ ...p, color: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Привод</label>
                <select value={newCar.drive_type} onChange={(e) => setNewCar(p => ({ ...p, drive_type: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5">
                  <option value="передний">Передний</option><option value="задний">Задний</option><option value="полный">Полный</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">КПП</label>
                <select value={newCar.transmission} onChange={(e) => setNewCar(p => ({ ...p, transmission: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5">
                  <option value="автомат">Автомат</option><option value="механика">Механика</option><option value="робот">Робот</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full bg-[#050b14] hover:bg-[#111e2f] text-white font-bold py-4 rounded-xl uppercase font-mono text-[10px] tracking-wider transition shadow disabled:opacity-50">
              {isLoading ? 'Сохранение...' : 'Добавить в базу'}
            </button>
          </form>
        </div>
      )}

      {/* ===== ADVERTISEMENTS ===== */}
      {crmView === 'advertisements' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 font-sans flex items-center gap-1.5">
              <FileText className="text-sky-500 w-4 h-4" /> Создать объявление
            </h3>
            <form onSubmit={handleCreateAdvertisement} className="space-y-3 text-xs font-sans">
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Автомобиль (VIN)</label>
                <select required value={newAd.car_vin} onChange={(e) => setNewAd(p => ({ ...p, car_vin: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-3">
                  <option value="">-- Выберите --</option>
                  {cars.map(c => <option key={c.vin} value={c.vin}>{c.make} {c.model} ({c.year}) — {c.vin}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Цена (₽)</label>
                  <input type="number" required value={newAd.car_price}
                    onChange={(e) => setNewAd(p => ({ ...p, car_price: parseInt(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Пробег (км)</label>
                  <input type="number" required value={newAd.mileage}
                    onChange={(e) => setNewAd(p => ({ ...p, mileage: parseInt(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Состояние</label>
                <select value={newAd.condition} onChange={(e) => setNewAd(p => ({ ...p, condition: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5">
                  <option value="Отличное">Отличное</option><option value="Хорошее">Хорошее</option>
                  <option value="Удовлетворительное">Удовлетворительное</option><option value="Требует ремонта">Требует ремонта</option>
                </select>
              </div>
              <button type="submit" disabled={isLoading}
                className="w-full bg-[#050b14] hover:bg-[#111e2f] text-white font-bold py-3.5 rounded-xl uppercase font-mono text-[10px] tracking-wider transition shadow disabled:opacity-50">
                {isLoading ? 'Создание...' : 'Создать объявление'}
              </button>
            </form>
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">Объявления ({advertisements.length})</h3>
            {advertisements.length === 0 ? (
              <div className="bg-slate-50 border border-dashed text-center py-8 rounded-xl text-slate-500 text-xs">Нет объявлений</div>
            ) : (
              <div className="space-y-2">
                {advertisements.map((ad: any) => (
                  <div key={ad.id} className="bg-white border border-slate-150 p-3 rounded-xl flex items-center justify-between shadow-sm">
                    <div>
                      <span className="font-bold text-slate-800 text-xs">
                        {ad.car?.brand?.name || '?'} {ad.car?.model?.name || '?'} ({ad.car?.year || '?'})
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        VIN: {ad.car?.vin || ad.car_vin} • {ad.mileage?.toLocaleString()} км
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm text-slate-900 font-mono">{parseFloat(ad.car_price)?.toLocaleString()} ₽</span>
                      <span className="text-[10px] text-slate-400 block">{ad.condition}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== CATALOG WITH SEARCH ===== */}
      {crmView === 'listings' && (
        <div className="space-y-4 font-sans text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">Каталог ({filteredCars.length}/{cars.length})</h3>
            {onRefreshData && (
              <button onClick={onRefreshData} className="text-slate-400 hover:text-sky-500 transition p-1">
                <RefreshCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Поиск по марке, модели, VIN, цвету..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-sky-400 transition"
            />
            {catalogSearch && (
              <button onClick={() => setCatalogSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters row */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Марка</label>
              <select value={catalogBrandFilter} onChange={(e) => setCatalogBrandFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs outline-none">
                <option value="">Все марки</option>
                {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Год от</label>
              <input type="number" value={catalogYearFrom} onChange={(e) => setCatalogYearFrom(e.target.value)}
                placeholder="2018" className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Год до</label>
              <input type="number" value={catalogYearTo} onChange={(e) => setCatalogYearTo(e.target.value)}
                placeholder="2025" className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs outline-none" />
            </div>
          </div>

          {/* Active filters */}
          {(catalogBrandFilter || catalogYearFrom || catalogYearTo) && (
            <div className="flex items-center gap-2 flex-wrap">
              {catalogBrandFilter && (
                <span className="bg-sky-50 text-sky-700 text-[10px] px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                  {catalogBrandFilter}
                  <button onClick={() => setCatalogBrandFilter('')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {catalogYearFrom && (
                <span className="bg-sky-50 text-sky-700 text-[10px] px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                  от {catalogYearFrom}
                  <button onClick={() => setCatalogYearFrom('')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {catalogYearTo && (
                <span className="bg-sky-50 text-sky-700 text-[10px] px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                  до {catalogYearTo}
                  <button onClick={() => setCatalogYearTo('')}><X className="w-3 h-3" /></button>
                </span>
              )}
              <button onClick={() => { setCatalogBrandFilter(''); setCatalogYearFrom(''); setCatalogYearTo(''); setCatalogSearch(''); }}
                className="text-[10px] text-slate-400 hover:text-red-500 underline">Сбросить все</button>
            </div>
          )}

          {/* Cars list */}
          {filteredCars.length === 0 ? (
            <div className="bg-slate-50 border border-dashed text-center py-8 rounded-xl text-slate-500 text-xs">
              {cars.length === 0 ? 'В базе нет автомобилей' : 'Нет результатов по фильтрам'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCars.map((c) => (
                <div key={c.id} className="bg-white border border-slate-150 p-3 rounded-xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-7 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">{c.make} {c.model}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {c.year} • {c.engineVolume}л • {c.power}л.с. • {c.color}
                      </span>
                      <span className="text-[10px] text-slate-300 font-mono">VIN: {c.vin}</span>
                    </div>
                  </div>
                  <button type="button"
                    onClick={() => { onDeleteCar(c.id); showToast(`🗑️ ${c.make} ${c.model} удалён`); }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition" title="Удалить">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
