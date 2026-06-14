import { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Subscription, FilterOptions } from '../types';

interface EditSubscriptionScreenProps {
  subscription: Subscription;
  filterOptions: FilterOptions | null;
  onBack: () => void;
  onSave: (updated: Subscription) => Promise<void> | void;
}

export default function EditSubscriptionScreen({
  subscription, filterOptions, onBack, onSave,
}: EditSubscriptionScreenProps) {
  const [yearFrom, setYearFrom] = useState(subscription.yearFrom?.toString() || '');
  const [yearTo, setYearTo] = useState(subscription.yearTo?.toString() || '');
  const [priceFrom, setPriceFrom] = useState(subscription.priceRubFrom ? (subscription.priceRubFrom / 1e6).toString() : '');
  const [priceTo, setPriceTo] = useState(subscription.priceRubTo ? (subscription.priceRubTo / 1e6).toString() : '');
  const [mileageFrom, setMileageFrom] = useState(subscription.mileageFrom?.toString() || '');
  const [mileageTo, setMileageTo] = useState(subscription.mileageTo?.toString() || '');
  const [engineFrom, setEngineFrom] = useState(subscription.engineVolumeFrom?.toString() || '');
  const [engineTo, setEngineTo] = useState(subscription.engineVolumeTo?.toString() || '');
  const [fuelType, setFuelType] = useState(subscription.fuelType || '');
  const [gearbox, setGearbox] = useState(subscription.gearbox || '');
  const [bodyType, setBodyType] = useState(subscription.bodyType || '');
  const [color, setColor] = useState(subscription.color || '');
  const [isSaving, setIsSaving] = useState(false);

  const fuelTypes = filterOptions?.fuel_types || [];
  const transmissions = filterOptions?.transmissions || [];
  const bodyTypes = filterOptions?.body_types || [];
  const colors = filterOptions?.colors || [];

  const handleSave = async () => {
    setIsSaving(true);
    const updated: Subscription = {
      ...subscription,
      yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
      yearTo: yearTo ? parseInt(yearTo) : undefined,
      priceRubFrom: priceFrom ? parseFloat(priceFrom) * 1_000_000 : undefined,
      priceRubTo: priceTo ? parseFloat(priceTo) * 1_000_000 : undefined,
      mileageFrom: mileageFrom ? parseInt(mileageFrom) : undefined,
      mileageTo: mileageTo ? parseInt(mileageTo) : undefined,
      engineVolumeFrom: engineFrom ? parseFloat(engineFrom) : undefined,
      engineVolumeTo: engineTo ? parseFloat(engineTo) : undefined,
      fuelType: fuelType || undefined,
      gearbox: gearbox || undefined,
      bodyType: bodyType || undefined,
      color: color || undefined,
    };
    try { await onSave(updated); } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6 pb-28">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition active:scale-95">
          <ArrowLeft className="w-5 h-5 text-slate-800" />
        </button>
        <div>
          <span className="text-xl font-bold font-sans text-slate-800 tracking-tight">Редактирование</span>
          <p className="text-[11px] text-slate-400 font-mono">{subscription.make || 'Любая марка'} {subscription.model}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="inline-flex items-center gap-1.5 bg-slate-900 text-white rounded-lg px-3 py-2 text-xs font-bold shadow-sm">{subscription.make || 'Любая марка'}</div>
        {subscription.model && <div className="inline-flex items-center gap-1.5 bg-slate-700 text-white rounded-lg px-3 py-2 text-xs font-bold shadow-sm">{subscription.model}</div>}
      </div>

      <div className="space-y-4">
        <RangeRow label="Год выпуска" from={yearFrom} to={yearTo} onFrom={setYearFrom} onTo={setYearTo} phFrom="2017" phTo="2026" />
        <RangeRow label="Цена, млн ₽" from={priceFrom} to={priceTo} onFrom={setPriceFrom} onTo={setPriceTo} phFrom="0.5" phTo="6.0" step="0.1" />
        <RangeRow label="Пробег, км" from={mileageFrom} to={mileageTo} onFrom={setMileageFrom} onTo={setMileageTo} phFrom="0" phTo="150000" />
        <RangeRow label="Объём двигателя, л" from={engineFrom} to={engineTo} onFrom={setEngineFrom} onTo={setEngineTo} phFrom="1.0" phTo="3.0" step="0.1" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Тип топлива" value={fuelType} onChange={setFuelType} anyLabel="Любое"
          options={fuelTypes.map(f => ({ value: f.value, label: f.display || f.value }))} />
        <Select label="Коробка передач" value={gearbox} onChange={setGearbox} anyLabel="Любая"
          options={transmissions.map(t => ({ value: t.value, label: t.value }))} />
        <Select label="Тип кузова" value={bodyType} onChange={setBodyType} anyLabel="Любой"
          options={bodyTypes.map(b => ({ value: b.value, label: b.value }))} />
        <Select label="Цвет" value={color} onChange={setColor} anyLabel="Любой"
          options={colors.map(c => ({ value: c.value, label: c.value }))} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-xl max-w-sm mx-auto z-10">
        <button onClick={handleSave} disabled={isSaving}
          className="w-full bg-[#050b14] hover:bg-slate-800 text-white font-bold tracking-tight py-4 px-4 rounded-xl text-xs uppercase font-mono shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50">
          <Save className="w-3.5 h-3.5 text-sky-400" />
          <span>{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
        </button>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, anyLabel }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; anyLabel: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase font-mono font-bold text-slate-500 block mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-2.5 text-slate-800 outline-none focus:border-sky-400">
        <option value="">{anyLabel}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function RangeRow({ label, from, to, onFrom, onTo, phFrom, phTo, step }: {
  label: string; from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void; phFrom: string; phTo: string; step?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700 block font-sans">{label}</label>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-mono w-4">от</span>
        <input type="number" step={step} value={from} onChange={(e) => onFrom(e.target.value)} placeholder={phFrom}
          className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm outline-none text-slate-800 focus:bg-white border border-transparent focus:border-sky-300" />
        <span className="text-xs text-slate-400 font-mono w-4">до</span>
        <input type="number" step={step} value={to} onChange={(e) => onTo(e.target.value)} placeholder={phTo}
          className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm outline-none text-slate-800 focus:bg-white border border-transparent focus:border-sky-300" />
      </div>
    </div>
  );
}
