import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Bell, Sliders, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Car, SearchFilters, Subscription, FilterOptions } from '../types';
import api from '../services/api';

const PAGE_SIZE = 12;

// Номера страниц с многоточиями: 1 … p-1 p p+1 … N
function pageNumbers(current: number, total: number): (number | '…')[] {
  const pages: (number | '…')[] = [];
  const push = (p: number) => pages.push(p);
  const window = [current - 1, current, current + 1].filter(p => p > 1 && p < total);
  push(1);
  if (window.length && window[0] > 2) pages.push('…');
  window.forEach(push);
  if (window.length && window[window.length - 1] < total - 1) pages.push('…');
  if (total > 1) push(total);
  return pages;
}

const SORT_OPTIONS = [
  { value: '', label: 'Сначала новые' },
  { value: 'price_krw', label: 'Сначала дешевле' },
  { value: '-price_krw', label: 'Сначала дороже' },
  { value: 'mileage', label: 'Меньше пробег' },
  { value: '-year', label: 'Год: новее' },
];

interface ListingsScreenProps {
  filters: SearchFilters;
  filterOptions: FilterOptions | null;
  subscriptions: Subscription[];
  onBack: () => void;
  onOpenFilters: () => void;
  onSelectCar: (car: Car) => void;
  onChangeFilters: (filters: SearchFilters) => void;
  onSubscribe: () => Promise<boolean>;
}

export default function ListingsScreen({
  filters,
  subscriptions,
  onBack,
  onOpenFilters,
  onSelectCar,
  onChangeFilters,
  onSubscribe,
}: ListingsScreenProps) {
  const [cars, setCars] = useState<Car[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [galleryIndexes, setGalleryIndexes] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    const res = await api.cars.search(filters, p, PAGE_SIZE);
    setCount(res.count);
    setTotalPages(res.totalPages);
    setPage(res.page);
    setCars(res.results);
    setGalleryIndexes({});
    setLoading(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [filters]);

  // Сброс на первую страницу при смене фильтров
  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const prevPhoto = (carId: string, max: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setGalleryIndexes(prev => {
      const cur = prev[carId] || 0;
      return { ...prev, [carId]: cur === 0 ? max - 1 : cur - 1 };
    });
  };
  const nextPhoto = (carId: string, max: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setGalleryIndexes(prev => {
      const cur = prev[carId] || 0;
      return { ...prev, [carId]: cur === max - 1 ? 0 : cur + 1 };
    });
  };

  const isSubscribed = subscriptions.some(s =>
    (s.brandId ?? null) === (filters.brandId ?? null) &&
    (s.modelGroupId ?? null) === (filters.modelGroupId ?? null)
  );

  const handleSubscribe = async () => {
    const ok = await onSubscribe();
    if (ok) {
      const scope = filters.make ? `${filters.make}${filters.model ? ' ' + filters.model : ''}` : 'заданные фильтры';
      setToast(`🔔 Подписка оформлена на ${scope}! Бот пришлёт уведомление о новых предложениях.`);
      setTimeout(() => setToast(null), 4500);
    }
  };

  const title = filters.make
    ? `${filters.make}${filters.model ? ' · ' + filters.model : ''}`
    : 'Все марки';

  return (
    <div className="space-y-5 pb-12">
      {/* Search header */}
      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onBack} className="p-2 hover:bg-white rounded-xl shadow-sm transition active:scale-95">
            <ArrowLeft className="w-4 h-4 text-slate-800" />
          </button>
          <div className="text-left min-w-0">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Параметры поиска</p>
            <p className="text-xs font-bold text-slate-800 line-clamp-1">{title}</p>
          </div>
        </div>
        <button
          onClick={onOpenFilters}
          className="bg-white hover:bg-slate-50 transition p-2.5 rounded-xl border border-slate-200 flex items-center justify-center shadow-sm shrink-0"
          title="Фильтры"
        >
          <Sliders className="w-4 h-4 text-sky-500" />
        </button>
      </div>

      {toast && (
        <div className="bg-sky-900 text-white font-medium p-3.5 rounded-xl text-xs flex items-center gap-2.5 shadow-md border border-sky-800">
          <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Results header + sort + subscribe */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block font-mono">Каталог · Корея</span>
          <h2 className="text-sm font-bold text-slate-800">
            {loading ? 'Загрузка…' : count === 0 ? 'Совпадений нет' : `Найдено: ${count.toLocaleString('ru-RU')}`}
          </h2>
        </div>
        <button
          onClick={handleSubscribe}
          disabled={isSubscribed}
          className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition shrink-0 ${
            isSubscribed
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>{isSubscribed ? 'Вы подписаны' : 'Подписаться'}</span>
        </button>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-400 font-mono uppercase">Сортировка</span>
        <select
          value={filters.sort}
          onChange={(e) => onChangeFilters({ ...filters, sort: e.target.value })}
          className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-sky-400"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-150 overflow-hidden animate-pulse">
              <div className="h-52 bg-slate-100" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-slate-100 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : cars.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 text-center py-12 rounded-2xl px-5 space-y-3">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Нет предложений в наличии</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[250px] mx-auto">
              Под выбранные параметры пока ничего нет. Оформите подписку — бот известит вас о новых завозах.
            </p>
          </div>
          {!isSubscribed && (
            <button onClick={handleSubscribe} className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold py-2 px-4 shadow-sm transition">
              Подписаться на этот запрос
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {cars.map((car) => {
              const photoIndex = galleryIndexes[car.id] || 0;
              const imagesCount = car.images.length;
              return (
                <div
                  key={car.id}
                  onClick={() => onSelectCar(car)}
                  className="group bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer"
                >
                  <div className="h-52 bg-stone-100 relative overflow-hidden">
                    {imagesCount > 0 ? (
                      <img
                        src={car.images[photoIndex]}
                        alt={`${car.make} ${car.model}`}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">Нет фото</div>
                    )}
                    <span className="absolute top-3 left-3 bg-slate-900/80 text-[10px] text-white px-2.5 py-1 rounded-full font-medium backdrop-blur-[2px]">
                      🇰🇷 Корея · экспорт
                    </span>
                    <span className="absolute top-3 right-3 bg-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded font-mono">
                      {car.year} г.в.
                    </span>
                    {imagesCount > 1 && (
                      <>
                        <button onClick={(e) => prevPhoto(car.id, imagesCount, e)} className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition active:scale-90">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => nextPhoto(car.id, imagesCount, e)} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition active:scale-90">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1 bg-black/20 p-1.5 rounded-full backdrop-blur-[1px]">
                          {car.images.slice(0, 8).map((_, idx) => (
                            <span key={idx} className={`h-1.5 rounded-full transition ${idx === photoIndex ? 'bg-white w-2.5' : 'bg-white/40 w-1.5'}`} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base font-sans tracking-tight">{car.make} {car.model}</h3>
                      {car.badge && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{car.badge}</p>}
                      <p className="text-xs text-slate-500 font-mono mt-1 leading-relaxed">
                        {car.engineVolume ? `${car.engineVolume.toFixed(1)} л · ` : ''}{car.fuelType}{car.gearbox ? ` · ${car.gearbox}` : ''}{car.bodyType ? ` · ${car.bodyType}` : ''} · {car.mileage.toLocaleString('ru-RU')} км
                      </p>
                      {/* Доп. характеристики из БД */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {car.color && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-slate-50 border border-slate-150 text-slate-600 px-1.5 py-0.5 rounded">
                            {car.colorHex && <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: car.colorHex }} />}
                            {car.color}
                          </span>
                        )}
                        {car.seatCount ? <span className="text-[10px] bg-slate-50 border border-slate-150 text-slate-600 px-1.5 py-0.5 rounded">{car.seatCount} мест</span> : null}
                        {car.salesStatus && <span className="text-[10px] bg-slate-50 border border-slate-150 text-slate-600 px-1.5 py-0.5 rounded">{car.salesStatus}</span>}
                        {car.hasAccidentRecord != null && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${car.hasAccidentRecord ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                            {car.hasAccidentRecord ? 'Есть ДТП' : 'Без ДТП'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-end justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono block">Цена в Корее</span>
                        <span className="text-base font-extrabold text-rose-600 font-mono tracking-wide">{car.priceWon.toLocaleString('ru-RU')} ₩</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono block">В рублях с растаможкой</span>
                        <span className="text-sm font-black text-slate-900 font-mono tracking-wide">{car.priceRub.toLocaleString('ru-RU')} ₽</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Постраничная навигация */}
          {totalPages > 1 && (
            <div className="pt-3 flex items-center justify-between gap-2">
              <button
                onClick={() => fetchPage(page - 1)}
                disabled={page <= 1 || loading}
                className="flex items-center gap-1 bg-white border border-slate-200 hover:border-sky-300 text-slate-700 font-semibold py-2.5 px-3 rounded-xl text-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Назад
              </button>

              <div className="flex items-center gap-1">
                {pageNumbers(page, totalPages).map((p, i) =>
                  p === '…' ? (
                    <span key={`g${i}`} className="text-slate-400 text-xs px-1">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => fetchPage(p as number)}
                      className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition ${
                        p === page ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-sky-300'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() => fetchPage(page + 1)}
                disabled={page >= totalPages || loading}
                className="flex items-center gap-1 bg-white border border-slate-200 hover:border-sky-300 text-slate-700 font-semibold py-2.5 px-3 rounded-xl text-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Вперёд <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="text-center text-[11px] text-slate-400 font-mono">
            Страница {page} из {totalPages} · всего {count.toLocaleString('ru-RU')}
          </p>
        </>
      )}
    </div>
  );
}
