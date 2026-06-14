import { useRef } from 'react';
import { Sliders, History, Bell, Plus, Trash2, ArrowRight, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
  onViewCarDetails: (car: Car) => void;
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
}: HomeScreenProps) {
  const carouselRef = useRef<HTMLDivElement>(null);

  // Карусель «Может заинтересовать»: прокрутка на ~видимую ширину (4 карточки в ряд)
  const scrollCarousel = (dir: -1 | 1) => {
    const el = carouselRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">

      {/* Единый блок поиска: марка/модель + все параметры в одном месте */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-md border border-slate-800 space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <Search className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-stone-300 font-mono">Подбор автомобиля</span>
        </div>

        {/* Make, Model Search Bar Trigger */}
        <button
          onClick={onOpenBrandSelector}
          className="w-full bg-slate-800 hover:bg-slate-750 active:scale-[0.99] text-left px-4 py-3.5 rounded-xl text-stone-300 flex items-center justify-between transition duration-200"
        >
          <span className="font-medium text-sm text-stone-200 font-sans">Марка и модель</span>
          <ArrowRight className="w-4 h-4 text-stone-400" />
        </button>

        {/* Единая кнопка фильтров (год, цена, пробег и все параметры — один экран) */}
        <button
          onClick={() => onOpenFilters()}
          className="w-full bg-slate-850 hover:bg-slate-800 text-stone-200 text-sm font-semibold py-3.5 px-4 rounded-xl active:scale-[0.99] flex items-center justify-between transition border border-slate-800 duration-150"
        >
          <span className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>Параметры: год, цена, пробег и др.</span>
          </span>
          <ArrowRight className="w-4 h-4 text-stone-400" />
        </button>
      </div>

      {/* Отдельный переключатель заказы/подписки (визуально отделён от фильтров) */}
      <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1.5 rounded-2xl">
        <button
          onClick={() => setTab('orders')}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold text-center transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-1.5 ${
            currentTab === 'orders' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" /> Заказы
          {orders.length > 0 && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] rounded-full">{orders.length}</span>}
        </button>
        <button
          onClick={() => setTab('subscriptions')}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold text-center transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-1.5 ${
            currentTab === 'subscriptions' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="w-3.5 h-3.5" /> Подписки
          {subscriptions.length > 0 && <span className="px-1.5 py-0.5 bg-sky-500 text-white text-[9px] rounded-full">{subscriptions.length}</span>}
        </button>
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
                        {(s.mileageFrom || s.mileageTo) && (
                          <div>🛣️ {s.mileageFrom || 0} - {s.mileageTo || '∞'} км</div>
                        )}
                        {s.fuelType && <div>⛽ {s.fuelType}</div>}
                        {s.gearbox && <div>🔧 {s.gearbox}</div>}
                        {s.bodyType && <div>🚙 {s.bodyType}</div>}
                        {s.color && <div>🎨 {s.color}</div>}
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

      {/* Может заинтересовать — карусель (4 карточки в ряд, листание стрелками) */}
      {popularCars.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 tracking-tight font-sans">Может заинтересовать</h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollCarousel(-1)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-slate-700 flex items-center justify-center transition active:scale-90"
                aria-label="Назад"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollCarousel(1)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-slate-700 flex items-center justify-center transition active:scale-90"
                aria-label="Вперёд"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={carouselRef}
            className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 -mx-1 px-1
                       [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {popularCars.map((car) => (
              <div
                key={car.id}
                onClick={() => onViewCarDetails(car)}
                className="group bg-white rounded-xl border border-slate-150 overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all duration-200
                           shrink-0 snap-start w-[calc(25%-0.5rem)] min-w-[88px]"
              >
                <div className="aspect-square bg-slate-100 relative overflow-hidden">
                  {car.images[0] ? (
                    <img
                      src={car.images[0]}
                      alt={car.model}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-300">Нет фото</div>
                  )}
                </div>
                <div className="p-1.5 space-y-0.5">
                  <p className="font-bold text-slate-800 text-[11px] leading-tight line-clamp-2">{car.make} {car.model}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{car.year}</p>
                  <p className="text-[10px] font-black text-slate-900 font-mono tracking-tight">
                    {(car.priceRub / 1_000_000).toFixed(1)} млн ₽
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
