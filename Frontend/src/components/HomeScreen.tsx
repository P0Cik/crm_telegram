import React from 'react';
import { Sliders, History, Bell, Plus, Trash2, ArrowRight } from 'lucide-react';
import { Car, Order, Subscription } from '../types';

interface HomeScreenProps {
  currentTab: 'orders' | 'subscriptions';
  setTab: (tab: 'orders' | 'subscriptions') => void;
  orders: Order[];
  subscriptions: Subscription[];
  popularCars: Car[];
  onOpenBrandSelector: () => void;
  onOpenFilters: () => void;
  onViewOrder: (id: string) => void;
  onDeleteSubscription: (id: string) => void;
  onViewCarDetails: (id: string) => void;
  onOpenSubscriptions: () => void;
  onEditSubscription: (id: string) => void;
}

export default function HomeScreen({
  currentTab,
  setTab,
  orders,
  subscriptions,
  popularCars,
  onOpenBrandSelector,
  onOpenFilters,
  onViewOrder,
  onDeleteSubscription,
  onViewCarDetails,
  onOpenSubscriptions,
  onEditSubscription,
  telegramUser
}: HomeScreenProps) {
  return (
    <div className="space-y-6">

      {/* Main Unified Search Container (Exactly as in the sketch) */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-md border border-slate-800 space-y-2">
        {/* Make, Model Search Bar Trigger */}
        <button
          onClick={onOpenBrandSelector}
          className="w-full bg-slate-800 hover:bg-slate-750 active:scale-[0.99] text-left px-4 py-3.5 rounded-xl text-stone-300 flex items-center justify-between transition duration-200"
        >
          <span className="font-medium text-sm text-stone-200 font-sans">Марка, модель</span>
          <ArrowRight className="w-4 h-4 text-stone-400" />
        </button>

        {/* Quick parameters trigger row */}
        <div className="grid grid-cols-12 gap-2">
          <button
            onClick={() => onOpenFilters()}
            className="col-span-3 bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-semibold py-3 px-1 rounded-xl active:scale-[0.98] transition border border-slate-800 duration-150"
          >
            Год
          </button>
          
          <button
            onClick={() => onOpenFilters()}
            className="col-span-3 bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-semibold py-3 px-1 rounded-xl active:scale-[0.98] transition border border-slate-800 duration-150"
          >
            Цена
          </button>

          <button
            onClick={() => onOpenFilters()}
            className="col-span-6 bg-slate-850 hover:bg-slate-800 text-stone-200 text-xs font-semibold py-3 px-3 rounded-xl active:scale-[0.98] flex items-center justify-center gap-1.5 transition border border-slate-800 duration-150"
          >
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>Параметры</span>
          </button>
        </div>

        {/* Big Tab Switches */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => setTab('orders')}
            className={`py-3 px-2 rounded-xl text-xs font-bold text-center border transition-all duration-150 active:scale-[0.98] ${
              currentTab === 'orders'
                ? 'bg-white text-slate-900 border-white shadow-sm'
                : 'bg-transparent text-stone-400 border-slate-800 hover:text-white'
            }`}
          >
            Заказы {orders.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[9px] rounded-full">{orders.length}</span>}
          </button>

          <button
            onClick={() => setTab('subscriptions')}
            className={`py-3 px-2 rounded-xl text-xs font-bold text-center border transition-all duration-150 active:scale-[0.98] ${
              currentTab === 'subscriptions'
                ? 'bg-white text-slate-900 border-white shadow-sm'
                : 'bg-transparent text-stone-400 border-slate-800 hover:text-white'
            }`}
          >
            Подписки {subscriptions.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-sky-500 text-white text-[9px] rounded-full">{subscriptions.length}</span>}
          </button>
        </div>
      </div>

      {/* Toggled Tabs Outputs */}
      <div>
        {currentTab === 'orders' ? (
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <History className="w-3.5 h-3.5 text-blue-500" /> Активные заказы
            </h3>

            {orders.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 text-center py-8 rounded-xl px-4">
                <p className="text-sm text-slate-500">У вас пока нет оформленных заказов.</p>
                <p className="text-xs text-slate-400 mt-1">Используйте поиск и сделайте тестовую заявку!</p>
              </div>
            ) : (
              orders.map((o) => (
                <div 
                  key={o.id}
                  className="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition duration-150 hover:shadow"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-20 h-16 rounded-xl bg-slate-100 overflow-hidden relative border border-slate-100">
                      <img 
                        src={o.carDetails.images[0]} 
                        alt={o.carDetails.model} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1 rounded font-mono font-medium">Корея</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-semibold font-mono tracking-wider">
                          №{o.id}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">от 2 июня</span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm mt-0.5">{o.carDetails.make} {o.carDetails.model}</h4>
                      <p className="text-xs text-sky-600 font-semibold mt-0.5">В пути • Ожид: {o.expectedDeliveryDate}</p>
                    </div>
                  </div>
                  
                  <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => onViewOrder(o.id)}
                      className="w-full md:w-auto bg-stone-100 hover:bg-stone-200 text-slate-700 text-xs font-semibold py-2.5 px-4 rounded-xl transition inline-flex items-center justify-center gap-1"
                    >
                      <span>Посмотреть на карте</span>
                    </button>
                    <button
                      onClick={() => onViewOrder(o.id)}
                      className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-sm transition inline-flex items-center justify-center"
                    >
                      Отслеживать статус
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-sky-500" /> Отслеживаемые запросы
              </h3>
              <button 
                onClick={onOpenSubscriptions}
                className="text-xs text-sky-600 hover:text-sky-700 font-bold inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Настроить подписку
              </button>
            </div>

            {subscriptions.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 text-center py-8 rounded-xl px-4">
                <p className="text-sm text-slate-500">Список подписок пуст.</p>
                <p className="text-xs text-slate-400 mt-1">Добавьте запросы, чтобы получать TG-оповещения первыми!</p>
              </div>
            ) : (
              subscriptions.map((s) => (
                <div 
                  key={s.id}
                  className="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center">
                      <Sliders className="w-5 h-5 text-sky-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{s.make} {s.model}</h4>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 space-y-0.5">
                        {(s.yearFrom || s.yearTo) && (
                          <div>📅 {s.yearFrom || '...'} - {s.yearTo || '...'} гг.</div>
                        )}
                        {(s.priceRubFrom || s.priceRubTo) ? (
                          <div>💰 {s.priceRubFrom ? (s.priceRubFrom / 1000000).toFixed(1) : '...'} - {s.priceRubTo ? (s.priceRubTo / 1000000).toFixed(1) : '...'} млн ₽</div>
                        ) : (
                          <div>💰 Любая цена</div>
                        )}
                        {(s.engineVolumeFrom || s.engineVolumeTo) && (
                          <div>⚙️ {s.engineVolumeFrom || '...'} - {s.engineVolumeTo || '...'} л</div>
                        )}
                        {(s.powerFrom || s.powerTo) && (
                          <div>⚡ {s.powerFrom || '...'} - {s.powerTo || '...'} л.с.</div>
                        )}
                        {s.fuelType && <div>⛽ {s.fuelType}</div>}
                        {s.gearbox && <div>🔧 {s.gearbox}</div>}
                        {s.driveType && <div>🚗 {s.driveType}</div>}
                        {s.wheelPosition && <div>🎯 {s.wheelPosition}</div>}
                        {s.color && <div>🎨 {s.color}</div>}
                        {s.country && <div>🌍 {s.country}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onEditSubscription(s.id)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-lg font-medium transition"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => onDeleteSubscription(s.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                      title="Удалить подписку"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Popular Listings ("Берут чаще всего") */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 tracking-tight font-sans">Берут чаще всего</h3>
          <span className="text-xs font-mono text-slate-450 bg-stone-100 px-2 py-0.5 rounded">Сеул • Пусан</span>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {popularCars.map((car) => (
            <div 
              key={car.id}
              onClick={() => onViewCarDetails(car.id)}
              className="group bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all duration-200"
            >
              {/* Photo */}
              <div className="h-28 sm:h-36 bg-slate-100 relative overflow-hidden">
                <img 
                  src={car.images[0]} 
                  alt={car.model} 
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute top-2 left-2 bg-slate-900/80 text-[10px] text-white px-2 py-0.5 rounded-full font-sans font-medium backdrop-blur-[2px]">
                  Корея
                </span>
              </div>

              {/* Specs */}
              <div className="p-3 space-y-1.5">
                <div>
                  <h4 className="text-xs text-slate-500 font-mono tracking-wide">{car.make}</h4>
                  <p className="font-bold text-slate-800 text-sm line-clamp-1">{car.model}, {car.year}</p>
                </div>

                <div className="pt-1.5 border-t border-slate-100 space-y-0.5 font-mono">
                  <p className="text-xs font-black text-rose-600 tracking-wide">
                    {car.priceWon.toLocaleString()} ₩
                  </p>
                  <p className="text-xs font-bold text-slate-900 tracking-wide">
                    {car.priceRub.toLocaleString()} ₽
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
