import React, { useState } from 'react';
import { 
  Briefcase, Truck, Key, Layers, Package, User, PlusCircle, Check, 
  Trash2, AlertTriangle, RefreshCcw, Landmark, FileText, CheckCircle2 
} from 'lucide-react';
import { Car, Order, Subscription, OrderStatus, Checkpoint } from '../types';

interface AdminCRMProps {
  cars: Car[];
  orders: Order[];
  subscriptions: Subscription[];
  onAddCar: (car: Car) => void;
  onUpdateOrder: (updatedOrder: Order) => void;
  onDeleteCar: (id: string) => void;
}

export default function AdminCRM({
  cars,
  orders,
  subscriptions,
  onAddCar,
  onUpdateOrder,
  onDeleteCar
}: AdminCRMProps) {
  // Views inside CRM: 'orders-list' | 'add-car' | 'listings'
  const [crmView, setCrmView] = useState<'orders-list' | 'add-car' | 'listings'>('orders-list');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Car form data states
  const [newCar, setNewCar] = useState<Partial<Car>>({
    make: 'BMW',
    model: '3-series',
    year: 2020,
    priceWon: 31000000,
    priceRub: 2150000,
    images: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=800'],
    country: 'Корея',
    dateAdded: '2026-06-02',
    engineVolume: 2.0,
    fuelType: 'бензин',
    gearbox: 'автомат',
    wheelPosition: 'левый',
    driveType: 'задний',
    color: 'черный',
    mileage: 18000,
    power: 184,
    vin: 'WBA5A51000LJ03928',
    isPopular: false
  });

  // Checkpoint adding form states
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [newCheckpointText, setNewCheckpointText] = useState('Прошел таможню Владивосток');
  const [newCheckpointInspector, setNewCheckpointInspector] = useState('Чернов Роман Павлович');
  const [newCheckpointPhoto, setNewCheckpointPhoto] = useState('https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800');

  const showToast = (txt: string) => {
    setToastMessage(txt);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateCar = (e: React.FormEvent) => {
    e.preventDefault();
    const carId = `car-${Date.now()}`;
    const fullCar: Car = {
      ...(newCar as Car),
      id: carId,
      images: newCar.images && newCar.images.length > 0 ? newCar.images : [
        'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=800'
      ]
    };

    onAddCar(fullCar);
    showToast(`🚗 Автомобиль ${fullCar.make} ${fullCar.model} успешно добавлен в корейский каталог!`);
    setCrmView('listings');

    // Trigger alert checks
    const matches = subscriptions.filter(s => 
      s.make.toLowerCase() === fullCar.make.toLowerCase() && 
      s.model.toLowerCase() === fullCar.model.toLowerCase()
    );
    if (matches.length > 0) {
      alert(`🔔 СОВПАДЕНИЕ! Найден клиент на этот автомобиль! Бот симулирует уведомления в Telegram-канале.`);
    }
  };

  const handleChangeOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    const ord = orders.find(o => o.id === orderId);
    if (!ord) return;

    // Define standard checkpoint texts for different steps
    let automaticStatusText = 'Изменен статус заказа';
    let automaticPhoto = 'https://images.unsplash.com/photo-1520105072000-f44fc083e54c?auto=format&fit=crop&q=80&w=800';

    if (nextStatus === 'korea_warehouse') {
      automaticStatusText = 'Автомобиль прибыл на консолидационный склад в Корее (Пусан)';
      automaticPhoto = 'https://images.unsplash.com/photo-1520105072000-f44fc083e54c?auto=format&fit=crop&q=80&w=800';
    } else if (nextStatus === 'shipping') {
      automaticStatusText = 'Погружен на паром. Морской транзит в РФ';
      automaticPhoto = 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=800';
    } else if (nextStatus === 'delivered') {
      automaticStatusText = 'Таможенная очистка пройдена. Автомобиль готов к выдаче клиенту';
      automaticPhoto = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800';
    }

    const newCheckpoint: Checkpoint = {
      id: `cp-status-${Date.now()}`,
      statusText: automaticStatusText,
      date: 'Сегодня',
      imageUrl: automaticPhoto,
      inspectorName: 'Ли Сын У (Главный Логист)',
      inspectionTime: new Date().toLocaleDateString('ru-RU') + ' ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };

    const updated: Order = {
      ...ord,
      status: nextStatus,
      checkpoints: [newCheckpoint, ...ord.checkpoints]
    };

    onUpdateOrder(updated);
    showToast(`📦 Статус заказа №${orderId} изменен на "${nextStatus}". Добавлен фото-отчет!`);
  };

  const handleAddCheckpointToOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      alert('Пожалуйста, выберите заказ.');
      return;
    }

    const ord = orders.find(o => o.id === selectedOrderId);
    if (!ord) return;

    const newCp: Checkpoint = {
      id: `cp-man-${Date.now()}`,
      statusText: newCheckpointText,
      date: 'Сегодня',
      imageUrl: newCheckpointPhoto,
      inspectorName: newCheckpointInspector,
      inspectionTime: new Date().toLocaleDateString('ru-RU') + ' ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };

    const updated: Order = {
      ...ord,
      checkpoints: [newCp, ...ord.checkpoints]
    };

    onUpdateOrder(updated);
    showToast(`📸 Фото-отчет успешно добавлен к заказу №${selectedOrderId}!`);
    setNewCheckpointText('');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Tab select header of CRM */}
      <div className="flex bg-slate-900 text-white rounded-2xl p-2.5 items-center justify-between shadow border border-slate-800">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-sky-400" />
          <span className="font-extrabold text-sm tracking-tight font-sans">Korea Auto CRM (Менеджер)</span>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-xl gap-1">
          <button
            onClick={() => setCrmView('orders-list')}
            className={`text-[10px] uppercase font-bold tracking-wider font-mono py-1.5 px-3.5 rounded-lg transition ${
              crmView === 'orders-list' ? 'bg-sky-505 bg-slate-700 text-sky-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Заказы
          </button>
          <button
            onClick={() => setCrmView('add-car')}
            className={`text-[10px] uppercase font-bold tracking-wider font-mono py-1.5 px-3.5 rounded-lg transition ${
              crmView === 'add-car' ? 'bg-slate-700 text-sky-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            + Добавить авто
          </button>
          <button
            onClick={() => setCrmView('listings')}
            className={`text-[10px] uppercase font-bold tracking-wider font-mono py-1.5 px-3.5 rounded-lg transition ${
              crmView === 'listings' ? 'bg-slate-700 text-sky-450 text-sky-450/100 text-sky-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            Каталог
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="bg-emerald-900 border border-emerald-800 text-white px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* CRM Order Status and Checkpoint adding section */}
      {crmView === 'orders-list' && (
        <div className="space-y-5">
          {/* Active Orders List */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">Управление заказами ({orders.length})</h3>

            {orders.length === 0 ? (
              <div className="bg-slate-50 border border-dashed text-center py-8 rounded-xl text-slate-500 text-xs">
                Пока нет оформленных заказов. Сделайте заказ в каталоге!
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((o) => (
                  <div key={o.id} className="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm space-y-3.5">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">Заказ №{o.id}</span>
                          <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded font-bold font-mono">
                            {o.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-sans mt-1">
                          Клиент: <strong className="text-slate-700">{o.clientName}</strong> ({o.clientPhone})
                        </p>
                        <p className="text-[11px] text-slate-405 font-mono">Авто: {o.carDetails.make} {o.carDetails.model} ({o.carDetails.year})</p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">К оплате в РФ</span>
                        <span className="font-black text-slate-950 font-mono text-sm">{o.carDetails.priceRub.toLocaleString()} ₽</span>
                      </div>
                    </div>

                    {/* Fast Status Change Actions */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <span className="text-[10px] text-slate-405 font-mono uppercase font-black block">Сменить этап доставки (авто-генерация вехи в TG):</span>
                      
                      <div className="grid grid-cols-3 gap-1.5 font-sans">
                        <button
                          onClick={() => handleChangeOrderStatus(o.id, 'korea_warehouse')}
                          className={`py-2 px-1 text-[10px] font-bold rounded-lg transition border ${
                            o.status === 'korea_warehouse' 
                              ? 'bg-sky-50 border-sky-400 text-sky-700' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Склад Корея
                        </button>
                        <button
                          onClick={() => handleChangeOrderStatus(o.id, 'shipping')}
                          className={`py-2 px-1 text-[10px] font-bold rounded-lg transition border ${
                            o.status === 'shipping' 
                              ? 'bg-sky-50 border-sky-400 text-sky-700' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          В пути в РФ
                        </button>
                        <button
                          onClick={() => handleChangeOrderStatus(o.id, 'delivered')}
                          className={`py-2 px-1 text-[10px] font-bold rounded-lg transition border ${
                            o.status === 'delivered' 
                              ? 'bg-sky-50 border-sky-400 text-sky-700' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Доставлен
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form to append manual checkpoint foto and inspector report */}
          <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-800 font-sans flex items-center gap-1.5">
              <PlusCircle className="text-sky-500 w-4 h-4" /> Добавить кастомный фото-отчет
            </h3>

            <form onSubmit={handleAddCheckpointToOrder} className="space-y-3 text-xs font-sans">
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Выберите Заказ</label>
                <select
                  required
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-3 text-slate-800 outline-none"
                >
                  <option value="">-- Выбрать из списка --</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>№{o.id} ({o.clientName} - {o.carDetails.make} {o.carDetails.model})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Статус/Лог операции</label>
                <input
                  type="text"
                  required
                  value={newCheckpointText}
                  onChange={(e) => setNewCheckpointText(e.target.value)}
                  placeholder="e.g. Успешно пройден таможенный осмотр в г. Находка"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">ФИО Эксперта</label>
                  <input
                    type="text"
                    required
                    value={newCheckpointInspector}
                    onChange={(e) => setNewCheckpointInspector(e.target.value)}
                    placeholder="e.g. Пак Мин Кю"
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Ссылка на фото ЛКП/Кузова</label>
                  <select
                    value={newCheckpointPhoto}
                    onChange={(e) => setNewCheckpointPhoto(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2.5"
                  >
                    <option value="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800">Customs Clearance Zone</option>
                    <option value="https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=800">Inspection on road</option>
                    <option value="https://images.unsplash.com/photo-1520105072000-f44fc083e54c?auto=format&fit=crop&q=80&w=800">Parking consolidation yard</option>
                    <option value="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=800">Transportation Carrier Truck</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#050b14] hover:bg-[#111e2f] text-white font-bold py-3.5 rounded-xl uppercase font-mono text-[10px] tracking-wider transition shadow"
              >
                Опубликовать веху в приложении
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CRM New Stock Car addition view form */}
      {crmView === 'add-car' && (
        <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-800 font-sans">Внесение автомобиля в Корейскую базу выкупа</h3>

          <form onSubmit={handleCreateCar} className="space-y-3.5 text-xs font-sans">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Марка авто (e.g. BMW)</label>
                <select
                  value={newCar.make}
                  onChange={(e) => setNewCar(p => ({ ...p, make: e.target.value, model: e.target.value === 'BMW' ? '3-series' : 'A4' }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5"
                >
                  <option value="BMW">BMW</option>
                  <option value="Audi">Audi</option>
                  <option value="Chevrolet">Chevrolet</option>
                  <option value="Ford">Ford</option>
                  <option value="Geely">Geely</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Модель (e.g. 1-series)</label>
                <input
                  type="text"
                  required
                  value={newCar.model || ''}
                  onChange={(e) => setNewCar(p => ({ ...p, model: e.target.value }))}
                  placeholder="3-series"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Год выпуска</label>
                <input
                  type="number"
                  required
                  value={newCar.year || 2020}
                  onChange={(e) => setNewCar(p => ({ ...p, year: parseInt(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Цена воны (₩)</label>
                <input
                  type="number"
                  required
                  value={newCar.priceWon || 25000000}
                  onChange={(e) => setNewCar(p => ({ ...p, priceWon: parseInt(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Цена рубли (₽)</label>
                <input
                  type="number"
                  required
                  value={newCar.priceRub || 1500000}
                  onChange={(e) => setNewCar(p => ({ ...p, priceRub: parseInt(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Пробег (км)</label>
                <input
                  type="number"
                  required
                  value={newCar.mileage || 29000}
                  onChange={(e) => setNewCar(p => ({ ...p, mileage: parseInt(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Номер кузова (VIN)</label>
                <input
                  type="text"
                  required
                  value={newCar.vin || ''}
                  onChange={(e) => setNewCar(p => ({ ...p, vin: e.target.value }))}
                  placeholder="WBA1A1..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Объем двигателя (литры)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newCar.engineVolume || 1.5}
                  onChange={(e) => setNewCar(p => ({ ...p, engineVolume: parseFloat(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Мощность (л.с.)</label>
                <input
                  type="number"
                  value={newCar.power || 150}
                  onChange={(e) => setNewCar(p => ({ ...p, power: parseInt(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Топливо</label>
                <select
                  value={newCar.fuelType}
                  onChange={(e) => setNewCar(p => ({ ...p, fuelType: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5"
                >
                  <option value="бензин">Бензин</option>
                  <option value="дизель">Дизель</option>
                  <option value="гибрид">Гибрид</option>
                  <option value="электро">Электро</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Изображение автомобиля (Unsplash URL)</label>
              <select
                onChange={(e) => setNewCar(p => ({ ...p, images: [e.target.value] }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5"
              >
                <option value="https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=800">BMW Sedan (Dark)</option>
                <option value="https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=800">BMW Sport hatchback (Grey)</option>
                <option value="https://images.unsplash.com/photo-1606220838315-055d997b5337?auto=format&fit=crop&q=80&w=800">Audi Premium Hatch</option>
                <option value="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800">Porsche coupe style (Dark)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-[#050b14] hover:bg-[#111e2f] text-white font-bold py-4 rounded-xl uppercase font-mono text-[10px] tracking-wider transition shadow"
            >
              Добавить в корейскую базу
            </button>
          </form>
        </div>
      )}

      {/* CRM Stock active listings catalog with deleting ability */}
      {crmView === 'listings' && (
        <div className="space-y-3 font-sans text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">Каталог в наличии ({cars.length})</h3>
            <span className="text-slate-450 text-[10px]">Кликните ведро для удаления</span>
          </div>

          <div className="space-y-2">
            {cars.map((c) => (
              <div key={c.id} className="bg-white border border-slate-150 p-3 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2.5">
                  <img src={c.images[0]} alt="" className="w-10 h-7 rounded object-cover border border-slate-100" referrerPolicy="no-referrer" />
                  <div>
                    <span className="font-bold text-slate-800">{c.make} {c.model}</span>
                    <span className="text-[10px] text-slate-450 font-mono block">Год: {c.year} • Пробег: {c.mileage.toLocaleString()} км</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-mono">{(c.priceWon/1000000).toFixed(1)} млн ₩</span>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteCar(c.id);
                      showToast(`🗑️ Автомобиль ${c.make} ${c.model} удален из базы.`);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                    title="Удалить из каталога"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
