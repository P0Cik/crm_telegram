import React, { useState } from 'react';
import { ArrowLeft, Bell, Sliders, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Car, SearchFilters, Subscription } from '../types';

interface ListingsScreenProps {
  catalog: Car[];
  filters: SearchFilters;
  onBack: () => void;
  onOpenFilters: () => void;
  onSelectCar: (id: string) => void;
  onAddSubscription: (make: string, model: string, filters?: SearchFilters) => void;
  subscriptions: Subscription[];
}

export default function ListingsScreen({
  catalog,
  filters,
  onBack,
  onOpenFilters,
  onSelectCar,
  onAddSubscription,
  subscriptions
}: ListingsScreenProps) {
  // Local state to manage car image gallery sliders index
  const [galleryIndexes, setGalleryIndexes] = useState<Record<string, number>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const prevPhoto = (carId: string, max: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setGalleryIndexes(prev => {
      const cur = prev[carId] || 0;
      const nextIdx = cur === 0 ? max - 1 : cur - 1;
      return { ...prev, [carId]: nextIdx };
    });
  };

  const nextPhoto = (carId: string, max: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setGalleryIndexes(prev => {
      const cur = prev[carId] || 0;
      const nextIdx = cur === max - 1 ? 0 : cur + 1;
      return { ...prev, [carId]: nextIdx };
    });
  };

  // Filter logic application
  const filteredCars = catalog.filter(car => {
    // Brand & model checks
    if (filters.make && !['Все марки', 'Любая марка', ''].includes(filters.make) && car.make.toLowerCase() !== filters.make.toLowerCase()) return false;
    if (filters.model && !['Все модели', 'Любая модель', ''].includes(filters.model) && !car.model.toLowerCase().includes(filters.model.toLowerCase())) return false;

    // Condition Check
    if (filters.condition === 'new' && car.mileage > 100) return false;
    if (filters.condition === 'used' && car.mileage <= 100) return false;

    // Year check
    const numYearFrom = parseInt(filters.yearFrom) || 0;
    const numYearTo = parseInt(filters.yearTo) || 9999;
    if (car.year < numYearFrom || car.year > numYearTo) return false;

    // Price Rub range
    const numPriceFrom = parseFloat(filters.priceFrom) || 0;
    const numPriceTo = parseFloat(filters.priceTo) || 9999;
    const priceRubMillion = car.priceRub / 1000000;
    if (numPriceFrom > 0 && priceRubMillion < numPriceFrom) return false;
    if (numPriceTo < 9999 && priceRubMillion > numPriceTo) return false;

    // Engine checks
    const numVolFrom = parseFloat(filters.engineVolumeFrom) || 0;
    const numVolTo = parseFloat(filters.engineVolumeTo) || 99;
    if (numVolFrom > 0 && car.engineVolume < numVolFrom) return false;
    if (numVolTo < 99 && car.engineVolume > numVolTo) return false;

    // Categories
    if (filters.fuelType && filters.fuelType !== 'Все виды' && car.fuelType !== filters.fuelType) return false;
    if (filters.gearbox && filters.gearbox !== 'Все коробки' && car.gearbox !== filters.gearbox) return false;
    if (filters.color && filters.color !== 'Все цвета' && car.color !== filters.color) return false;

    return true;
  });

  const activeMake = filters.make || 'BMW';
  const activeModel = filters.model || 'Любая модель';

  const isSubscribed = subscriptions.some(
    sub => sub.make.toLowerCase() === activeMake.toLowerCase() && 
           sub.model.toLowerCase() === activeModel.toLowerCase()
  );

  const handleSubscribeClick = () => {
    onAddSubscription(activeMake, activeModel, filters);
    setToastMessage(`🎉 Подписка оформлена на ${activeMake} ${activeModel}! Вы получите TG-уведомление при новых завозах.`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Search Header breadcrumbs & trigger */}
      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white rounded-xl shadow-sm transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-slate-800" />
          </button>
          
          <div className="text-left font-sans">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Параметры поиска</p>
            <p className="text-xs font-bold text-slate-800 line-clamp-1">
              {filters.make || 'Все марки'} {filters.model ? `• ${filters.model}` : ''}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenFilters}
          className="bg-white hover:bg-slate-50 transition p-2.5 rounded-xl border border-slate-150 flex items-center justify-center text-slate-700 shadow-sm"
          title="Редактировать фильтры"
        >
          <Sliders className="w-4 h-4 text-sky-500" />
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-sky-900 text-white font-medium p-3.5 rounded-xl text-xs flex items-center gap-2.5 shadow-md border border-sky-800 animate-in fade-in duration-300">
          <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Results matching status action header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block font-mono">Каталог Корея</span>
          <h2 className="text-sm font-bold text-slate-800">
            {filteredCars.length === 0 
              ? 'Совпадений нет' 
              : `Найдено: ${filteredCars.length} предложений`
            }
          </h2>
        </div>

        {/* Subscribe Alert button */}
        <button
          onClick={handleSubscribeClick}
          disabled={isSubscribed}
          className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition duration-150 ${
            isSubscribed
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-900 border border-transparent text-white hover:bg-slate-850 active:scale-95'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>{isSubscribed ? '✓ Вы подписаны' : '+ Подписаться'}</span>
        </button>
      </div>

      {/* Cars Grid */}
      {filteredCars.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 text-center py-12 rounded-2xl px-5 space-y-3">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Нет предложений в наличии</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[250px] mx-auto">
              Автомобили с такими характеристиками раскуплены или ожидают выкупа. Оформите подписку и бот известит вас!
            </p>
          </div>
          <button
            onClick={handleSubscribeClick}
            className="bg-slate-900 hover:bg-slate-850 text-white rounded-lg text-xs font-semibold py-2 px-4 shadow-sm transition"
          >
            Подписаться на этот запрос
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCars.map((car) => {
            const photoIndex = galleryIndexes[car.id] || 0;
            const imagesCount = car.images.length;

            return (
              <div 
                key={car.id}
                onClick={() => onSelectCar(car.id)}
                className="group bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden hover:shadow transition duration-200 cursor-pointer"
              >
                {/* Photo slideshow component */}
                <div className="h-52 bg-stone-100 relative overflow-hidden">
                  <img 
                    src={car.images[photoIndex]} 
                    alt={`${car.make} ${car.model}`} 
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.01]"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Country Flag Badge */}
                  <span className="absolute top-3 left-3 bg-slate-900/80 text-[10px] text-white px-2.5 py-1 rounded-full font-sans font-medium backdrop-blur-[2px]">
                    🇿🇦 Корея экспорт
                  </span>

                  {/* Year Tag */}
                  <span className="absolute top-3 right-3 bg-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded font-mono">
                    {car.year} г.в.
                  </span>

                  {/* Slideshow Arrows (if images count > 1) */}
                  {imagesCount > 1 && (
                    <>
                      <button
                        onClick={(e) => prevPhoto(car.id, imagesCount, e)}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition active:scale-90"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => nextPhoto(car.id, imagesCount, e)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition active:scale-90"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Pagination Dots indicator */}
                      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1 bg-black/20 p-1.5 rounded-full backdrop-blur-[1px]">
                        {car.images.map((_, idx) => (
                          <span 
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full transition ${idx === photoIndex ? 'bg-white w-2.5' : 'bg-white/40'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Specs text & prices block */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base font-sans tracking-tight">
                      {car.make} {car.model}
                    </h3>
                    
                    {/* Technical spec details bullets list */}
                    <p className="text-xs text-slate-500 font-mono mt-1 leading-relaxed">
                      {car.engineVolume ? `${car.engineVolume.toFixed(1)} л • ` : ''}{car.fuelType} • {car.gearbox}{car.bodyType ? ` • ${car.bodyType}` : ''} • {car.mileage.toLocaleString()} км
                    </p>
                  </div>

                  {/* Prices indicators block */}
                  <div className="pt-3 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono block">Цена воны</span>
                      <span className="text-base font-extrabold text-rose-600 font-mono tracking-wide">
                        {car.priceWon.toLocaleString()} ₩
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono block">В рублях с растаможкой</span>
                      <span className="text-sm font-black text-slate-900 font-mono tracking-wide">
                        {car.priceRub.toLocaleString()} ₽
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
