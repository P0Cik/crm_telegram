import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, Plus, Trash2, Pencil } from 'lucide-react';
import { Subscription } from '../types';

interface SubscriptionsManagerProps {
  subscriptions: Subscription[];
  onBack: () => void;
  onAddSub: (sub: Omit<Subscription, 'id'>) => void;
  onDeleteSub: (id: string) => void;
  onEditSub?: (id: string) => void;
  filterOptions?: any;
}

export default function SubscriptionsManager({
  subscriptions,
  onBack,
  onAddSub,
  onDeleteSub,
  onEditSub,
  filterOptions
}: SubscriptionsManagerProps) {
  const [selectedMake, setSelectedMake] = useState('Hyundai');
  const [selectedModel, setSelectedModel] = useState('Palisade');

  const brands = filterOptions?.brands || [];
  const selectedBrandObj = brands.find((b: any) => b.name === selectedMake);
  const modelsForBrand = selectedBrandObj ? (filterOptions?.models || []).filter((m: any) => m.brand_id === selectedBrandObj.id) : [];

  useEffect(() => {
    if (brands.length > 0 && !brands.find((b: any) => b.name === selectedMake)) {
      const firstBrand = brands[0];
      setSelectedMake(firstBrand.name);
      const newModels = (filterOptions?.models || []).filter((m: any) => m.brand_id === firstBrand.id);
      if (newModels.length > 0) {
        setSelectedModel(newModels[0].name);
      }
    }
  }, [brands, filterOptions, selectedMake]);

  useEffect(() => {
    if (modelsForBrand.length > 0 && !modelsForBrand.find((m: any) => m.name === selectedModel)) {
      setSelectedModel(modelsForBrand[0].name);
    }
  }, [modelsForBrand, selectedModel]);
  
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [engineVolumeFrom, setEngineVolumeFrom] = useState('');
  const [engineVolumeTo, setEngineVolumeTo] = useState('');
  const [condition, setCondition] = useState<'all' | 'new' | 'used'>('all');
  const [fuelType, setFuelType] = useState('Все виды');
  const [gearbox, setGearbox] = useState('Все коробки');
  const [color, setColor] = useState('Все цвета');

  const [toast, setToast] = useState<string | null>(null);

  const handleMakeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const make = e.target.value;
    setSelectedMake(make);
    const newBrandObj = brands.find((b: any) => b.name === make);
    const newModels = newBrandObj ? (filterOptions?.models || []).filter((m: any) => m.brand_id === newBrandObj.id) : [];
    setSelectedModel(newModels[0]?.name || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddSub({
      make: selectedMake,
      model: selectedModel,
      yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
      yearTo: yearTo ? parseInt(yearTo) : undefined,
      priceRubFrom: priceFrom ? parseFloat(priceFrom) * 1000000 : undefined,
      priceRubTo: priceTo ? parseFloat(priceTo) * 1000000 : undefined,
      engineVolumeFrom: engineVolumeFrom ? parseFloat(engineVolumeFrom) : undefined,
      engineVolumeTo: engineVolumeTo ? parseFloat(engineVolumeTo) : undefined,
      condition: condition !== 'all' ? condition : undefined,
      fuelType: fuelType !== 'Все виды' ? fuelType : undefined,
      gearbox: gearbox !== 'Все коробки' ? gearbox : undefined,
      color: color !== 'Все цвета' ? color : undefined,
    });

    setToast(`🔔 Оповещения активированы для ${selectedMake} ${selectedModel}!`);
    setTimeout(() => setToast(null), 3000);

    // Reset some states
    setYearFrom('');
    setYearTo('');
    setPriceFrom('');
    setPriceTo('');
    setEngineVolumeFrom('');
    setEngineVolumeTo('');
    setCondition('all');
    setFuelType('Все виды');
    setGearbox('Все коробки');
    setColor('Все цвета');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Navigation Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-xl transition active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 text-slate-800" />
        </button>
        <div className="font-sans">
          <h1 className="text-lg font-bold text-slate-850 leading-tight">Мои подписки на авто</h1>
          <p className="text-[11px] text-slate-400">Telegram-оповещения о новых выкупах</p>
        </div>
      </div>

      {toast && (
        <div className="bg-sky-900 border border-sky-800 text-white px-3.5 py-3 rounded-xl text-xs font-semibold animate-in fade-in duration-200">
          {toast}
        </div>
      )}

      {/* Subscription lists view */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">Список активных лент</h3>
        
        {subscriptions.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 py-8 px-4 rounded-2xl text-center">
            <p className="text-xs text-slate-400">У вас пока нет активных фильтров подписок.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {subscriptions.map((s) => (
              <div
                key={s.id}
                className="bg-white border border-slate-150 p-3.5 rounded-xl flex items-center justify-between shadow-sm"
              >
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 text-sm">{s.make} {s.model}</h4>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 space-y-0.5">
                    {(s.yearFrom || s.yearTo) && (
                      <div>📅 Год: {s.yearFrom || '...'} - {s.yearTo || '...'}</div>
                    )}
                    {(s.priceRubFrom || s.priceRubTo) && (
                      <div>💰 Цена: {s.priceRubFrom ? (s.priceRubFrom / 1000000).toFixed(1) : '...'} - {s.priceRubTo ? (s.priceRubTo / 1000000).toFixed(1) : '...'} млн ₽</div>
                    )}
                    {(s.mileageFrom || s.mileageTo) && (
                      <div>🛣️ Пробег: {s.mileageFrom || '0'} - {s.mileageTo || '∞'} км</div>
                    )}
                    {(s.engineVolumeFrom || s.engineVolumeTo) && (
                      <div>⚙️ Объём: {s.engineVolumeFrom || '...'} - {s.engineVolumeTo || '...'} л</div>
                    )}
                    {(s.powerFrom || s.powerTo) && (
                      <div>⚡ Мощность: {s.powerFrom || '...'} - {s.powerTo || '...'} л.с.</div>
                    )}
                    {s.fuelType && (
                      <div>⛽ Топливо: {s.fuelType}</div>
                    )}
                    {s.gearbox && (
                      <div>🔧 КПП: {s.gearbox}</div>
                    )}
                    {s.driveType && (
                      <div>🚗 Привод: {s.driveType}</div>
                    )}
                    {s.wheelPosition && (
                      <div>🎯 Руль: {s.wheelPosition}</div>
                    )}
                    {s.color && (
                      <div>🎨 Цвет: {s.color}</div>
                    )}
                    {s.country && (
                      <div>🌍 Страна: {s.country}</div>
                    )}
                    {s.condition && (
                      <div>📋 Состояние: {s.condition}</div>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 items-center">
                  {onEditSub && (
                    <button
                      type="button"
                      onClick={() => onEditSub(s.id)}
                      className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteSub(s.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New subscription form block */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Bell className="w-4 h-4 text-sky-500 shrink-0" />
          <h3 className="font-bold text-sm text-slate-800 font-sans">Создать быструю подписку</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-mono font-bold text-slate-500 block mb-1">Марка авто</label>
              <select
                value={selectedMake}
                onChange={handleMakeChange}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-3 text-slate-800 outline-none"
              >
                {brands.map((b: any) => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono font-bold text-slate-500 block mb-1">Модель авто</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-3 text-slate-800 outline-none"
              >
                {modelsForBrand.map((m: any) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 font-sans">
            <div>
              <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">Год выпуска (от)</label>
              <input
                type="number"
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                placeholder="от 2010"
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-2.5 text-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">Год выпуска (до)</label>
              <input
                type="number"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                placeholder="до 2026"
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-2.5 text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 font-sans">
            <div>
              <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">Цена (от млн. ₽)</label>
              <input
                type="number"
                step="0.1"
                value={priceFrom}
                onChange={(e) => setPriceFrom(e.target.value)}
                placeholder="0.5"
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-2.5 text-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">Цена (до млн. ₽)</label>
              <input
                type="number"
                step="0.1"
                value={priceTo}
                onChange={(e) => setPriceTo(e.target.value)}
                placeholder="4.5"
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-2.5 text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 font-sans">
            <div>
              <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">Объём от (л)</label>
              <input
                type="number"
                step="0.1"
                value={engineVolumeFrom}
                onChange={(e) => setEngineVolumeFrom(e.target.value)}
                placeholder="1.0"
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-2.5 text-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">Объём до (л)</label>
              <input
                type="number"
                step="0.1"
                value={engineVolumeTo}
                onChange={(e) => setEngineVolumeTo(e.target.value)}
                placeholder="3.0"
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-2.5 text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 font-sans">
            <div>
              <label className="text-[9px] uppercase font-mono font-bold text-slate-400 block mb-1">Топливо</label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-2 text-slate-800 outline-none"
              >
                {['Все виды', 'бензин', 'дизель', 'гибрид', 'электро'].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase font-mono font-bold text-slate-400 block mb-1">Коробка</label>
              <select
                value={gearbox}
                onChange={(e) => setGearbox(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-2 text-slate-800 outline-none"
              >
                {['Все коробки', 'автомат', 'робот', 'механика'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase font-mono font-bold text-slate-400 block mb-1">Цвет</label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-2 text-slate-800 outline-none"
              >
                {['Все цвета', 'белый', 'черный', 'серый', 'синий', 'красный'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-stone-100 p-1 rounded-xl grid grid-cols-3 gap-1">
            {(['all', 'new', 'used'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setCondition(type)}
                className={`py-2 px-1 text-center font-bold text-[10px] sm:text-xs rounded-lg transition duration-150 ${
                  condition === type
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {type === 'all' && 'Все'}
                {type === 'new' && 'Новые'}
                {type === 'used' && 'С пробегом'}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-850 active:scale-95 text-white py-3.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition duration-150 inline-flex items-center justify-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4 text-sky-400" />
            <span>Включить оповещения ботом</span>
          </button>
        </form>
      </div>
    </div>
  );
}
