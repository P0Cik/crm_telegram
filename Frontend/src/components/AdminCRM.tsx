import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Briefcase, Package, PlusCircle, Trash2, RefreshCcw, CheckCircle2,
  Upload, Image as ImageIcon, X, Search, ChevronLeft, Plus, Eye, Loader2,
} from 'lucide-react';
import { Car, Order, Subscription, User, CatalogOption } from '../types';
import api from '../services/api';

interface AdminCRMProps {
  orders: Order[];
  subscriptions?: Subscription[];
  onUpdateOrder?: (updatedOrder: Order) => void;
  onRefreshData?: () => void;
}

const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  REVIEW: { label: 'На рассмотрении', color: 'bg-slate-100 text-slate-800' },
  APPLICATION: { label: 'Оформление заявки', color: 'bg-slate-100 text-slate-800' },
  AWAITING_PAYMENT: { label: 'Ожидается оплата', color: 'bg-yellow-100 text-yellow-800' },
  PURCHASE: { label: 'Выкуп автомобиля', color: 'bg-yellow-100 text-yellow-800' },
  TO_WAREHOUSE_KR: { label: 'В пути на склад (Корея)', color: 'bg-blue-100 text-blue-800' },
  AT_WAREHOUSE_KR: { label: 'Прибыл на склад (Корея)', color: 'bg-blue-100 text-blue-800' },
  DOCUMENTS: { label: 'Подготовка документов', color: 'bg-indigo-100 text-indigo-800' },
  SHIPPING_PREP: { label: 'Подготовка к отправке', color: 'bg-indigo-100 text-indigo-800' },
  TO_BORDER: { label: 'В пути на границу', color: 'bg-purple-100 text-purple-800' },
  CUSTOMS: { label: 'Таможенное оформление', color: 'bg-purple-100 text-purple-800' },
  TO_WAREHOUSE_RU: { label: 'В пути на склад (Россия)', color: 'bg-cyan-100 text-cyan-800' },
  TO_DESTINATION: { label: 'В пути в город назначения', color: 'bg-teal-100 text-teal-800' },
  DELIVERED: { label: 'Автомобиль передан клиенту', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Отменён', color: 'bg-red-100 text-red-800' },
};

const STATUS_FLOW = [
  'REVIEW', 'APPLICATION', 'AWAITING_PAYMENT', 'PURCHASE',
  'TO_WAREHOUSE_KR', 'AT_WAREHOUSE_KR', 'DOCUMENTS', 'SHIPPING_PREP',
  'TO_BORDER', 'CUSTOMS', 'TO_WAREHOUSE_RU', 'TO_DESTINATION', 'DELIVERED', 'CANCELLED',
];

const PAGE_SIZE = 20;

function EditClientForm({ user, onBack, onSaved, onDelete, showToast }: { user: User; onBack: () => void; onSaved: () => void; onDelete: () => void; showToast: (msg: string) => void }) {
  const [formData, setFormData] = useState({ first_name: user.first_name || '', last_name: user.last_name || '', phone: user.phone || '', email: user.email || '' });
  const [isActive, setIsActive] = useState(user.is_active);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await api.users.update(user.id, { ...formData, is_active: isActive });
    setIsLoading(false);
    if (result) { showToast('✅ Профиль сохранён'); onSaved(); } else showToast('❌ Ошибка сохранения');
  };

  const handleDelete = async () => {
    if (!window.confirm('Удалить пользователя? Действие необратимо.')) return;
    setIsLoading(true);
    const ok = await api.users.delete(user.id);
    setIsLoading(false);
    if (ok) { showToast('🗑 Пользователь удалён'); onDelete(); } else showToast('❌ Ошибка удаления');
  };

  return (
    <div className="space-y-5 font-sans text-sm bg-white p-4 rounded-2xl border border-slate-150">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"><ChevronLeft className="w-5 h-5" /></button>
          <h3 className="font-bold text-slate-800">Редактирование профиля</h3>
        </div>
        <button type="button" onClick={handleDelete} disabled={isLoading} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"><Trash2 className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([['first_name', 'Имя'], ['last_name', 'Фамилия'], ['phone', 'Телефон'], ['email', 'Email']] as const).map(([key, label]) => (
            <div key={key}>
              <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">{label}</label>
              <input type={key === 'email' ? 'email' : 'text'} value={(formData as any)[key]} onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-sky-400" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div>
            <p className="font-bold text-slate-800 text-sm">Статус профиля</p>
            <p className="text-[10px] text-slate-500">Заблокированные не могут создавать заказы</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
          </label>
        </div>
        <button type="submit" disabled={isLoading} className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3.5 rounded-xl uppercase font-mono text-xs tracking-wider transition shadow disabled:opacity-50">
          {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </form>
    </div>
  );
}

type CrmViewType = 'orders-list' | 'order-detail' | 'create-order' | 'advertisements' | 'clients-list' | 'edit-client';

export default function AdminCRM({ orders, onRefreshData }: AdminCRMProps) {
  const [crmView, setCrmView] = useState<CrmViewType>('orders-list');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // create-order
  const [orderCarSearch, setOrderCarSearch] = useState('');
  const [orderCarResults, setOrderCarResults] = useState<Car[]>([]);
  const [selectedOrderCar, setSelectedOrderCar] = useState<Car | null>(null);
  const [newOrderPrice, setNewOrderPrice] = useState(2000000);

  // photo report
  const [historyStatus, setHistoryStatus] = useState<string>('REVIEW');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // advertisements (server-paginated)
  const [catalog, setCatalog] = useState<Car[]>([]);
  const [catalogCount, setCatalogCount] = useState(0);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotalPages, setCatalogTotalPages] = useState(1);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [brands, setBrands] = useState<CatalogOption[]>([]);
  const [catSearch, setCatSearch] = useState('');
  const [catBrand, setCatBrand] = useState('');
  const [catYearFrom, setCatYearFrom] = useState('');
  const [catYearTo, setCatYearTo] = useState('');

  const showToast = (txt: string) => { setToastMessage(txt); setTimeout(() => setToastMessage(null), 3500); };

  useEffect(() => { api.catalog.brands().then(setBrands); }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    setUsers(await api.users.getAll());
    setIsLoading(false);
  };
  useEffect(() => { if (crmView === 'clients-list') loadUsers(); }, [crmView]);

  const catalogParams = useCallback(() => ({
    search: catSearch, brand_name: catBrand, year_min: catYearFrom, year_max: catYearTo,
  }), [catSearch, catBrand, catYearFrom, catYearTo]);

  const fetchCatalog = useCallback(async (page: number, append: boolean) => {
    setCatalogLoading(true);
    const res = await api.cars.query(catalogParams(), page, PAGE_SIZE);
    setCatalogCount(res.count);
    setCatalogTotalPages(res.totalPages);
    setCatalogPage(res.page);
    setCatalog(prev => (append ? [...prev, ...res.results] : res.results));
    setCatalogLoading(false);
  }, [catalogParams]);

  useEffect(() => {
    if (crmView !== 'advertisements') return;
    const t = setTimeout(() => fetchCatalog(1, false), 350);
    return () => clearTimeout(t);
  }, [crmView, fetchCatalog]);

  // car search for order creation
  useEffect(() => {
    if (crmView !== 'create-order') return;
    const t = setTimeout(async () => {
      const res = await api.cars.query({ search: orderCarSearch }, 1, 15);
      setOrderCarResults(res.results);
    }, 350);
    return () => clearTimeout(t);
  }, [crmView, orderCarSearch]);

  const handleChangeOrderStatus = async (orderId: string, nextStatus: string) => {
    setIsLoading(true);
    const result = await api.orders.updateStatus(orderId, nextStatus);
    if (result) { showToast(`📦 Статус: «${ORDER_STATUS_MAP[nextStatus]?.label || nextStatus}»`); onRefreshData?.(); }
    else showToast('❌ Ошибка');
    setIsLoading(false);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderCar) { showToast('⚠️ Выберите автомобиль'); return; }
    setIsLoading(true);
    const result = await api.orders.create(selectedOrderCar.id, newOrderPrice);
    if (result) { showToast('✅ Заказ создан'); onRefreshData?.(); setCrmView('orders-list'); setSelectedOrderCar(null); setOrderCarSearch(''); }
    else showToast('❌ Ошибка при создании заказа');
    setIsLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setPhotoFile(file); const r = new FileReader(); r.onloadend = () => setPhotoPreview(r.result as string); r.readAsDataURL(file); }
  };
  const clearPhoto = () => { setPhotoFile(null); setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const handleAddPhotoReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    setIsLoading(true);
    const result = await api.orderHistory.create({ order_id: parseInt(selectedOrderId), status: historyStatus, media_file: photoFile || undefined });
    if (result) { showToast('📸 Фото-отчёт добавлен'); clearPhoto(); onRefreshData?.(); } else showToast('❌ Ошибка');
    setIsLoading(false);
  };

  const selectedOrder = orders.find(o => o.id === selectedOrderId);
  const isSubView = crmView === 'order-detail' || crmView === 'create-order';

  return (
    <div className="space-y-6 pb-20">
      {!isSubView && (
        <div className="flex flex-col sm:flex-row bg-slate-900 text-white rounded-2xl p-2.5 items-center justify-between shadow border border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-sky-400" />
            <span className="font-extrabold text-sm tracking-tight font-sans">Korea Auto CRM</span>
          </div>
          <div className="flex flex-wrap bg-slate-800 p-1 rounded-xl gap-1">
            {(['orders-list', 'advertisements', 'clients-list'] as CrmViewType[]).map(v => {
              const labels: Record<string, string> = { 'orders-list': 'Заказы', 'advertisements': 'Объявления', 'clients-list': 'Клиенты' };
              return (
                <button key={v} onClick={() => setCrmView(v)} className={`text-[10px] uppercase font-bold tracking-wider font-mono py-1.5 px-3 rounded-lg transition ${crmView === v ? 'bg-slate-700 text-sky-400' : 'text-slate-400 hover:text-white'}`}>{labels[v]}</button>
              );
            })}
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="bg-emerald-900 border border-emerald-800 text-white px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /><span>{toastMessage}</span>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 text-sky-500 animate-spin" /><span className="text-xs text-slate-500 ml-2">Загрузка...</span>
        </div>
      )}

      {/* ORDERS LIST */}
      {crmView === 'orders-list' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">Заказы ({orders.length})</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setCrmView('create-order')} className="flex items-center gap-1 bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg transition uppercase font-mono"><Plus className="w-3 h-3" /> Новый заказ</button>
              {onRefreshData && <button onClick={onRefreshData} className="text-slate-400 hover:text-sky-500 transition p-1"><RefreshCcw className="w-4 h-4" /></button>}
            </div>
          </div>
          {orders.length === 0 ? (
            <div className="bg-slate-50 border border-dashed text-center py-8 rounded-xl text-slate-500 text-xs">Нет заказов</div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => {
                const bs = o.rawStatus || 'REVIEW';
                const si = ORDER_STATUS_MAP[bs] || { label: o.status, color: 'bg-gray-100 text-gray-800' };
                return (
                  <button key={o.id} onClick={() => { setSelectedOrderId(o.id); setHistoryStatus(bs); setCrmView('order-detail'); }}
                    className="w-full text-left bg-white border border-slate-150 rounded-2xl p-4 shadow-sm hover:border-sky-300 hover:shadow-md transition space-y-1">
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
                        <span className="font-black text-slate-950 font-mono text-sm">{o.carDetails.priceRub > 0 ? `${o.carDetails.priceRub.toLocaleString('ru-RU')} ₽` : '—'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-sky-500 font-semibold pt-1"><Eye className="w-3 h-3" /> Открыть</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE ORDER */}
      {crmView === 'create-order' && (
        <div className="space-y-4">
          <button onClick={() => setCrmView('orders-list')} className="flex items-center gap-1 text-xs text-slate-500 hover:text-sky-500 transition font-semibold"><ChevronLeft className="w-4 h-4" /> Назад к заказам</button>
          <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 font-sans flex items-center gap-1.5"><PlusCircle className="text-sky-500 w-4 h-4" /> Создать заказ</h3>
            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs font-sans">
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Поиск автомобиля (марка, модель, VIN)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" value={orderCarSearch} onChange={(e) => { setOrderCarSearch(e.target.value); setSelectedOrderCar(null); }}
                    placeholder="BMW, X5, VIN..." className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-sky-400" />
                </div>
              </div>
              {!selectedOrderCar ? (
                <div className="max-h-52 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-1.5 bg-slate-50">
                  {orderCarResults.length === 0 ? (
                    <p className="text-center text-slate-400 py-4 text-[11px]">Начните вводить запрос</p>
                  ) : orderCarResults.map(c => (
                    <button type="button" key={c.id} onClick={() => { setSelectedOrderCar(c); setNewOrderPrice(c.priceRub || 2000000); }}
                      className="w-full text-left bg-white border border-slate-150 rounded-lg p-2 hover:border-sky-300 transition flex items-center justify-between">
                      <span className="font-bold text-slate-700">{c.make} {c.model} <span className="text-slate-400 font-normal">({c.year})</span></span>
                      <span className="text-[10px] text-slate-400 font-mono">{c.priceRub.toLocaleString('ru-RU')} ₽</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{selectedOrderCar.make} {selectedOrderCar.model} ({selectedOrderCar.year})</p>
                    <p className="text-[10px] text-slate-500 font-mono">VIN: {selectedOrderCar.vin || '—'}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedOrderCar(null)} className="text-slate-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
                </div>
              )}
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Сумма заказа (₽)</label>
                <input type="number" required value={newOrderPrice} onChange={(e) => setNewOrderPrice(parseInt(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 outline-none focus:border-sky-400" />
              </div>
              <button type="submit" disabled={isLoading || !selectedOrderCar} className="w-full bg-[#050b14] hover:bg-[#111e2f] text-white font-bold py-3.5 rounded-xl uppercase font-mono text-[10px] tracking-wider transition shadow disabled:opacity-50">
                {isLoading ? 'Создание...' : 'Создать заказ'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ORDER DETAIL */}
      {crmView === 'order-detail' && selectedOrder && (() => {
        const bs = selectedOrder.rawStatus || 'REVIEW';
        const si = ORDER_STATUS_MAP[bs] || { label: selectedOrder.status, color: 'bg-gray-100 text-gray-800' };
        return (
          <div className="space-y-5">
            <button onClick={() => setCrmView('orders-list')} className="flex items-center gap-1 text-xs text-slate-500 hover:text-sky-500 transition font-semibold"><ChevronLeft className="w-4 h-4" /> Назад к заказам</button>
            <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-base text-slate-900">Заказ №{selectedOrder.id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${si.color}`}>{si.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Клиент: <strong className="text-slate-700">{selectedOrder.clientName}</strong></p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{selectedOrder.carDetails.make} {selectedOrder.carDetails.model} ({selectedOrder.carDetails.year})</p>
                  <p className="text-[10px] text-slate-300 font-mono">VIN: {selectedOrder.carDetails.vin || '—'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Сумма</span>
                  <span className="font-black text-slate-950 font-mono text-lg">{selectedOrder.carDetails.priceRub > 0 ? `${selectedOrder.carDetails.priceRub.toLocaleString('ru-RU')} ₽` : '—'}</span>
                  <span className="text-[10px] text-slate-400 block font-mono">от {selectedOrder.dateCreated}</span>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm space-y-3">
              <span className="text-[10px] text-slate-400 font-mono uppercase font-black block">Сменить этап доставки:</span>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 font-sans">
                {STATUS_FLOW.map((st) => (
                  <button key={st} onClick={() => handleChangeOrderStatus(selectedOrder.id, st)} disabled={isLoading}
                    className={`py-2 px-1 text-[9px] font-bold rounded-lg transition border ${bs === st ? 'bg-sky-50 border-sky-400 text-sky-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {ORDER_STATUS_MAP[st]?.label || st}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-4">
              <h3 className="font-bold text-sm text-slate-800 font-sans flex items-center gap-1.5"><PlusCircle className="text-sky-500 w-4 h-4" /> Добавить фото-отчёт</h3>
              <form onSubmit={handleAddPhotoReport} className="space-y-3 text-xs font-sans">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Статус этапа</label>
                  <select value={historyStatus} onChange={(e) => setHistoryStatus(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-3 text-slate-800 outline-none focus:border-sky-400">
                    {STATUS_FLOW.map(st => <option key={st} value={st}>{ORDER_STATUS_MAP[st]?.label || st}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Фото</label>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  {!photoPreview ? (
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-300 rounded-xl py-6 flex flex-col items-center gap-2 hover:border-sky-400 hover:bg-sky-50/30 transition">
                      <Upload className="w-8 h-8 text-slate-400" />
                      <span className="text-slate-500 text-xs">Нажмите для выбора фото</span>
                    </button>
                  ) : (
                    <div className="relative">
                      <img src={photoPreview} alt="" className="w-full h-48 object-cover rounded-xl border border-slate-200" />
                      <button type="button" onClick={clearPhoto} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition"><X className="w-4 h-4" /></button>
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-lg flex items-center gap-1"><ImageIcon className="w-3 h-3" />{photoFile?.name}</div>
                    </div>
                  )}
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-[#050b14] hover:bg-[#111e2f] text-white font-bold py-3.5 rounded-xl uppercase font-mono text-[10px] tracking-wider transition shadow disabled:opacity-50">
                  {isLoading ? 'Загрузка...' : 'Опубликовать фото-отчёт'}
                </button>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ADVERTISEMENTS (server-paginated) */}
      {crmView === 'advertisements' && (
        <div className="space-y-4 font-sans text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">Объявления ({catalogCount.toLocaleString('ru-RU')})</h3>
            <button onClick={() => fetchCatalog(1, false)} className="text-slate-400 hover:text-sky-500 transition p-1"><RefreshCcw className="w-4 h-4" /></button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={catSearch} onChange={(e) => setCatSearch(e.target.value)} placeholder="Поиск: марка, модель, VIN, цвет..." className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-sky-400 transition" />
            {catSearch && <button onClick={() => setCatSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Марка</label>
              <select value={catBrand} onChange={(e) => setCatBrand(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs outline-none">
                <option value="">Все</option>
                {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Год от</label>
              <input type="number" value={catYearFrom} onChange={(e) => setCatYearFrom(e.target.value)} placeholder="2018" className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Год до</label>
              <input type="number" value={catYearTo} onChange={(e) => setCatYearTo(e.target.value)} placeholder="2025" className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs outline-none" />
            </div>
          </div>

          {catalogLoading && catalog.length === 0 ? (
            <div className="text-center py-8 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
          ) : catalog.length === 0 ? (
            <div className="bg-slate-50 border border-dashed text-center py-8 rounded-xl text-slate-500 text-xs">Нет результатов</div>
          ) : (
            <>
              <div className="space-y-2">
                {catalog.map((c) => (
                  <div key={c.id} className="bg-white border border-slate-150 p-3 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-12 h-9 rounded bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-400 shrink-0">
                        {c.images[0] ? <img src={c.images[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <Package className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800">{c.make} {c.model}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">{c.year} · {c.engineVolume ? `${c.engineVolume.toFixed(1)}л · ` : ''}{c.color} · {c.mileage.toLocaleString('ru-RU')} км</span>
                        <span className="text-[10px] text-slate-300 font-mono block">VIN: {c.vin || '—'}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-sm text-slate-900 font-mono block">{c.priceRub.toLocaleString('ru-RU')} ₽</span>
                      <span className="text-[10px] text-slate-400 font-mono">{c.priceWon.toLocaleString('ru-RU')} ₩</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-center text-[11px] text-slate-400 font-mono">Показано {catalog.length} из {catalogCount.toLocaleString('ru-RU')}</p>
              {catalogPage < catalogTotalPages && (
                <button onClick={() => fetchCatalog(catalogPage + 1, true)} disabled={catalogLoading}
                  className="w-full bg-white border border-slate-200 hover:border-sky-300 text-slate-700 font-semibold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 disabled:opacity-60">
                  {catalogLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 text-sky-500" />}
                  <span>{catalogLoading ? 'Загрузка…' : 'Показать ещё'}</span>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* CLIENTS */}
      {crmView === 'clients-list' && (
        <div className="space-y-4 font-sans text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">Клиенты ({users.length})</h3>
            <button onClick={loadUsers} className="text-slate-400 hover:text-sky-500 transition p-1"><RefreshCcw className="w-4 h-4" /></button>
          </div>
          <div className="space-y-2">
            {users.map(user => (
              <div key={user.id} className="bg-white border border-slate-150 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between shadow-sm gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{user.first_name || 'Без имени'} {user.last_name || ''}</span>
                    {!user.is_active && <span className="bg-red-50 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">Заблокирован</span>}
                    {user.role === 'manager' && <span className="bg-purple-50 text-purple-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">Менеджер</span>}
                  </div>
                  <div className="text-slate-500 mt-1">
                    <p>Телефон: <span className="font-mono">{user.phone || 'Не указан'}</span></p>
                    {user.email && <p>Email: {user.email}</p>}
                    <p className="text-[10px] text-slate-400 mt-0.5">@{user.username || user.telegram_id}</p>
                  </div>
                </div>
                <button onClick={() => { setSelectedUserId(user.id); setCrmView('edit-client'); }} className="bg-sky-50 text-sky-600 hover:bg-sky-100 font-bold py-1.5 px-3 rounded-lg transition shrink-0">Изменить</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT CLIENT */}
      {crmView === 'edit-client' && selectedUserId && (
        <EditClientForm user={users.find(u => u.id === selectedUserId)!} showToast={showToast}
          onBack={() => setCrmView('clients-list')} onSaved={() => { loadUsers(); setCrmView('clients-list'); }} onDelete={() => { loadUsers(); setCrmView('clients-list'); }} />
      )}
    </div>
  );
}
