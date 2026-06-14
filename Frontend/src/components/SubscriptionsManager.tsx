import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, Plus, Trash2, Pencil } from 'lucide-react';
import { Subscription, FilterOptions, CatalogOption } from '../types';
import api from '../services/api';

interface SubscriptionsManagerProps {
  subscriptions: Subscription[];
  filterOptions: FilterOptions | null;
  onBack: () => void;
  onAddSub: (sub: Omit<Subscription, 'id'>) => void;
  onDeleteSub: (id: string) => void;
  onEditSub?: (id: string) => void;
}

export default function SubscriptionsManager({
  subscriptions, filterOptions, onBack, onAddSub, onDeleteSub, onEditSub,
}: SubscriptionsManagerProps) {
  const [brands, setBrands] = useState<CatalogOption[]>([]);
  const [groups, setGroups] = useState<CatalogOption[]>([]);
  const [brandId, setBrandId] = useState<number | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);

  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [mileageFrom, setMileageFrom] = useState('');
  const [mileageTo, setMileageTo] = useState('');
  const [engineFrom, setEngineFrom] = useState('');
  const [engineTo, setEngineTo] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [gearbox, setGearbox] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [color, setColor] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { api.catalog.brands().then(setBrands); }, []);
  useEffect(() => {
    if (brandId) api.catalog.modelGroupsByBrand(brandId).then(setGroups);
    else setGroups([]);
    setGroupId(null);
  }, [brandId]);

  const fuelTypes = filterOptions?.fuel_types || [];
  const transmissions = filterOptions?.transmissions || [];
  const bodyTypes = filterOptions?.body_types || [];
  const colors = filterOptions?.colors || [];

  const resetForm = () => {
    setYearFrom(''); setYearTo(''); setPriceFrom(''); setPriceTo('');
    setMileageFrom(''); setMileageTo(''); setEngineFrom(''); setEngineTo('');
    setFuelType(''); setGearbox(''); setBodyType(''); setColor('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const brand = brands.find(b => b.id === brandId);
    const group = groups.find(g => g.id === groupId);
    onAddSub({
      make: brand?.name || '',
      model: group?.name || '',
      brandId: brandId,
      modelGroupId: groupId,
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
    });
    setToast(`🔔 Подписка создана${brand ? ` на ${brand.name}${group ? ' ' + group.name : ''}` : ''}!`);
    setTimeout(() => setToast(null), 3000);
    resetForm();
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition active:scale-95">
          <ArrowLeft className="w-5 h-5 text-slate-800" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-tight">Мои подписки</h1>
          <p className="text-[11px] text-slate-400">Telegram-оповещения о новых предложениях</p>
        </div>
      </div>

      {toast && (
        <div className="bg-sky-900 border border-sky-800 text-white px-3.5 py-3 rounded-xl text-xs font-semibold">{toast}</div>
      )}

      {/* Existing subscriptions */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">Активные подписки ({subscriptions.length})</h3>
        {subscriptions.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 py-8 px-4 rounded-2xl text-center">
            <p className="text-xs text-slate-400">У вас пока нет подписок.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {subscriptions.map((s) => (
              <div key={s.id} className="bg-white border border-slate-150 p-3.5 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 text-sm">{s.make || 'Любая марка'} {s.model}</h4>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    {(s.yearFrom || s.yearTo) && <span>📅 {s.yearFrom || '...'}–{s.yearTo || '...'}</span>}
                    {(s.priceRubFrom || s.priceRubTo) && <span>💰 {s.priceRubFrom ? (s.priceRubFrom / 1e6).toFixed(1) : '...'}–{s.priceRubTo ? (s.priceRubTo / 1e6).toFixed(1) : '...'} млн ₽</span>}
                    {(s.mileageFrom || s.mileageTo) && <span>🛣️ {s.mileageFrom || 0}–{s.mileageTo || '∞'} км</span>}
                    {(s.engineVolumeFrom || s.engineVolumeTo) && <span>⚙️ {s.engineVolumeFrom || '...'}–{s.engineVolumeTo || '...'} л</span>}
                    {s.fuelType && <span>⛽ {s.fuelType}</span>}
                    {s.gearbox && <span>🔧 {s.gearbox}</span>}
                    {s.bodyType && <span>🚙 {s.bodyType}</span>}
                    {s.color && <span>🎨 {s.color}</span>}
                  </div>
                </div>
                <div className="flex gap-1 items-center shrink-0">
                  {onEditSub && (
                    <button onClick={() => onEditSub(s.id)} className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition">
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => onDeleteSub(s.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New subscription form */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Bell className="w-4 h-4 text-sky-500 shrink-0" />
          <h3 className="font-bold text-sm text-slate-800 font-sans">Новая подписка</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Марка">
              <select value={brandId ?? ''} onChange={(e) => setBrandId(e.target.value ? parseInt(e.target.value) : null)} className={selectCls}>
                <option value="">Любая марка</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Модель">
              <select value={groupId ?? ''} onChange={(e) => setGroupId(e.target.value ? parseInt(e.target.value) : null)} disabled={!brandId} className={selectCls}>
                <option value="">{brandId ? 'Любая модель' : 'Сначала марку'}</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <RangeInputs label="Год" from={yearFrom} to={yearTo} setFrom={setYearFrom} setTo={setYearTo} phFrom="от 2010" phTo="до 2026" />
            <RangeInputs label="Цена, млн ₽" from={priceFrom} to={priceTo} setFrom={setPriceFrom} setTo={setPriceTo} phFrom="0.5" phTo="5.0" step="0.1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <RangeInputs label="Пробег, км" from={mileageFrom} to={mileageTo} setFrom={setMileageFrom} setTo={setMileageTo} phFrom="0" phTo="150000" />
            <RangeInputs label="Объём, л" from={engineFrom} to={engineTo} setFrom={setEngineFrom} setTo={setEngineTo} phFrom="1.0" phTo="3.0" step="0.1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Топливо">
              <select value={fuelType} onChange={(e) => setFuelType(e.target.value)} className={selectCls}>
                <option value="">Любое</option>
                {fuelTypes.map((f) => <option key={f.value} value={f.value}>{f.display || f.value}</option>)}
              </select>
            </Field>
            <Field label="Коробка">
              <select value={gearbox} onChange={(e) => setGearbox(e.target.value)} className={selectCls}>
                <option value="">Любая</option>
                {transmissions.map((t) => <option key={t.value} value={t.value}>{t.value}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Кузов">
              <select value={bodyType} onChange={(e) => setBodyType(e.target.value)} className={selectCls}>
                <option value="">Любой</option>
                {bodyTypes.map((b) => <option key={b.value} value={b.value}>{b.value}</option>)}
              </select>
            </Field>
            <Field label="Цвет">
              <select value={color} onChange={(e) => setColor(e.target.value)} className={selectCls}>
                <option value="">Любой</option>
                {colors.map((c) => <option key={c.value} value={c.value}>{c.value}</option>)}
              </select>
            </Field>
          </div>

          <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 active:scale-95 text-white py-3.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition inline-flex items-center justify-center gap-1.5 shadow">
            <Plus className="w-4 h-4 text-sky-400" />
            <span>Включить оповещения</span>
          </button>
        </form>
      </div>
    </div>
  );
}

const selectCls = 'w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-2.5 text-slate-800 outline-none focus:border-sky-400 disabled:bg-slate-100 disabled:text-slate-400';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase font-mono font-bold text-slate-500 block mb-1">{label}</label>
      {children}
    </div>
  );
}

function RangeInputs({ label, from, to, setFrom, setTo, phFrom, phTo, step }: {
  label: string; from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void; phFrom: string; phTo: string; step?: string;
}) {
  const inp = 'w-full text-xs bg-white border border-slate-200 rounded-xl px-2 py-2.5 text-slate-800 outline-none focus:border-sky-400';
  return (
    <div>
      <label className="text-[10px] uppercase font-mono font-bold text-slate-500 block mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input type="number" step={step} value={from} onChange={(e) => setFrom(e.target.value)} placeholder={phFrom} className={inp} />
        <span className="text-slate-300 text-xs">—</span>
        <input type="number" step={step} value={to} onChange={(e) => setTo(e.target.value)} placeholder={phTo} className={inp} />
      </div>
    </div>
  );
}
