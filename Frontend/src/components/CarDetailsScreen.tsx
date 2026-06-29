import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Clipboard, CheckCircle, Smartphone, User, ShieldCheck } from 'lucide-react';
import { Car } from '../types';
import telegram from '../telegram';

interface CarDetailsScreenProps {
  car: Car;
  onBack: () => void;
  onPlaceOrder: (clientName: string, clientPhone: string) => void;
}

export default function CarDetailsScreen({
  car,
  onBack,
  onPlaceOrder
}: CarDetailsScreenProps) {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [copiedVin, setCopiedVin] = useState(false);
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false);

  // Checkout sheet inputs states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [orderProcessed, setOrderProcessed] = useState(false);


  useEffect(() => {
    return () => {
      telegram.hideMainButton();
    };
  }, []);

  const handleCopyVin = () => {
    navigator.clipboard.writeText(car.vin);
    setCopiedVin(true);
    telegram.hapticFeedback('light');
    setTimeout(() => setCopiedVin(false), 2000);
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    telegram.hapticFeedback('medium');
    setOrderProcessed(true);
    setTimeout(() => {
      onPlaceOrder(name, phone);
      telegram.notification('success');
      setOrderProcessed(false);
      setIsOrderSheetOpen(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-xl transition active:scale-95 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-slate-800" />
        </button>
        <span className="text-xs font-bold font-mono tracking-wider text-slate-400 bg-stone-100 px-2.5 py-1 rounded">
          {car.country} • {car.year} г.в.
        </span>
      </div>

      {/* Main Focus View Swapper */}
      <div className="space-y-2.5">
        <div className="h-64 sm:h-80 rounded-2xl overflow-hidden bg-slate-100 relative border border-slate-150 shadow-inner">
          <img
            src={car.images[activePhotoIdx]}
            alt={car.model}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-mono font-bold px-2 py-1 rounded">
            Фото {activePhotoIdx + 1} / {car.images.length}
          </span>
        </div>

        {/* Small thumbnail sliders */}
        {car.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 max-w-full touch-pan-x">
            {car.images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActivePhotoIdx(idx)}
                className={`w-16 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition ${activePhotoIdx === idx ? 'border-sky-500 scale-95 shadow-sm' : 'border-slate-200 hover:border-slate-450'
                  }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Title & Pricing Overview */}
      <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm space-y-3">
        <div>
          <span className="text-xs text-slate-400 font-bold tracking-wider font-mono uppercase">{car.make}</span>
          <h1 className="text-xl font-bold text-slate-800 font-sans tracking-tight leading-tight">
            {car.make} {car.model}, {car.year}
          </h1>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono block">В Южной Корее (выкуп)</span>
            <span className="text-lg font-mono font-extrabold text-rose-600 block">
              {car.priceWon.toLocaleString()} ₩
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono block">В РФ (с растаможкой)</span>
            <span className="text-lg font-mono font-black text-slate-900 block">
              {car.priceRub.toLocaleString()} ₽
            </span>
          </div>
        </div>
      </div>

      {/* Specifications Grid list */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">Характеристики автомобиля</h3>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-sans">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-medium block">Год выпуска</span>
            <span className="text-sm font-bold text-slate-800">{car.year}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-sans">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-medium block">Пробег</span>
            <span className="text-sm font-bold text-slate-800">{car.mileage.toLocaleString()} км</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-sans">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-medium block">Двигатель</span>
            <span className="text-sm font-bold text-slate-800">{car.engineVolume ? `${car.engineVolume.toFixed(1)} л` : '—'}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-sans">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-medium block">Тип топлива</span>
            <span className="text-sm font-bold text-slate-800 capitalize">{car.fuelType}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-sans">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-medium block">Трансмиссия</span>
            <span className="text-sm font-bold text-slate-800 capitalize">{car.gearbox}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-sans">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-medium block">Тип кузова</span>
            <span className="text-sm font-bold text-slate-800 capitalize">{car.bodyType || '—'}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-sans">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-medium block">Цветовой тон</span>
            <span className="text-sm font-bold text-slate-800 capitalize">{car.color}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-sans">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-medium block">Статус</span>
            <span className="text-sm font-bold text-slate-800">{car.salesStatus || '—'}</span>
          </div>
        </div>

        {/* Copyable VIN tag */}
        <div className="bg-amber-50 border border-amber-200/50 p-3 rounded-xl flex items-center justify-between gap-2.5">
          <div>
            <span className="text-[9px] font-bold text-amber-800 uppercase block font-mono">Номер кузова/кузовной код (VIN)</span>
            <code className="text-xs font-bold text-slate-800 font-mono tracking-wider">{car.vin}</code>
          </div>

          <button
            onClick={handleCopyVin}
            type="button"
            className="p-2 bg-white hover:bg-amber-100 hover:text-amber-900 border border-amber-200 text-amber-800 rounded-lg transition active:scale-90"
            title="Копировать VIN"
          >
            {copiedVin ? <Check className="w-4 h-4 text-emerald-600" /> : <Clipboard className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Safety warning */}
      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-150 flex items-start gap-2.5 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Автомобиль верифицирован корейским экспертом. Проведена вибродиагностика силовых узлов, компьютерный замер ЛКП на отсутствие повторного окраса.
        </p>
      </div>

      {/* Bottom stick button bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-lg max-w-sm mx-auto z-10 flex items-center gap-2">
        <button
          onClick={() => {
            setIsOrderSheetOpen(true);
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          }}
          className="w-full bg-[#050b14] hover:bg-slate-800 text-white font-bold tracking-tight py-4 px-4 rounded-xl text-xs uppercase font-mono shadow-md transition text-center"
        >
          Заказать доставку в РФ
        </button>
      </div>

      {/* Checkout Drawer (Bottom Sheet Mockup) */}
      {isOrderSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Sheet overlay background dismisser */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOrderSheetOpen(false)} />

          <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200 z-40 max-h-[90dvh] overflow-y-auto flex flex-col">
            {/* Grabber indicator */}
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-2" />

            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-base font-bold text-slate-850">Оформление заказа</h3>
                <p className="text-[11px] text-slate-450 mt-0.5">{car.make} {car.model} ({car.year})</p>
              </div>
              <button
                onClick={() => setIsOrderSheetOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-650 font-bold"
              >
                Отмена
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 font-sans flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" /> ФИО получателя
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ФИО получателя"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4.5 py-3 text-sm text-slate-800 outline-none focus:border-slate-450 focus:bg-white transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 font-sans flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" /> Телефон для связи
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (999) 000-00-00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4.5 py-3 text-sm text-slate-800 outline-none focus:border-slate-450 focus:bg-white transition"
                />
              </div>

              <div className="bg-sky-50 text-sky-800 p-3 rounded-xl text-xs space-y-1 font-sans border border-sky-100">
                <p className="font-bold">Что произойдет после подтверждения?</p>
                <p className="leading-normal text-[11px] text-slate-600">
                  Мы создадим бронь за вашим аккаунтом. Бот сразу пришлет статус-сообщение о бронировании. Менеджер свяжется с вами по указанному телефону для подготовки договора купли-продажи.
                </p>
              </div>

              <button
                type="submit"
                disabled={orderProcessed}
                className="w-full bg-[#050b14] hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs uppercase font-mono py-4 rounded-xl flex items-center justify-center gap-2 transition"
              >
                {orderProcessed ? (
                  <span className="w-4.5 h-4.5 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Подтвердить бронирование</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
