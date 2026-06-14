import { useState, useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft, X, ChevronDown, ChevronUp, Sliders, RotateCcw, Loader2 } from 'lucide-react';
import { SearchFilters, FilterOptions, FacetValue } from '../types';
import api from '../services/api';

interface FiltersScreenProps {
  initialFilters: SearchFilters;
  filterOptions: FilterOptions | null;
  onBack: () => void;
  onApply: (filters: SearchFilters) => void;
}

const RANGE = (a: string, b: string) => `${a || '...'} – ${b || '...'}`;

export default function FiltersScreen({ initialFilters, filterOptions, onBack, onApply }: FiltersScreenProps) {
  const [filters, setFilters] = useState<SearchFilters>({ ...initialFilters });
  const [expanded, setExpanded] = useState<string | null>('engine');
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (patch: Partial<SearchFilters>) => setFilters(prev => ({ ...prev, ...patch }));
  const toggle = (s: string) => setExpanded(prev => (prev === s ? null : s));

  useEffect(() => {
    setCounting(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await api.cars.search(filters, 1, 1);
      setMatchCount(res.count);
      setCounting(false);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [filters]);

  const fuelTypes = filterOptions?.fuel_types || [];
  const transmissions = filterOptions?.transmissions || [];
  const bodyTypes = filterOptions?.body_types || [];
  const colors = filterOptions?.colors || [];
  const interiorColors = filterOptions?.interior_colors || [];
  const seatCounts: FacetValue[] = (filterOptions?.seat_counts || []).map(s => ({
    value: String(s.value), display: `${s.value} мест`, count: s.count,
  }));

  const reset = () => setFilters({
    ...filters,
    yearFrom: '', yearTo: '', priceFrom: '', priceTo: '', mileageFrom: '', mileageTo: '',
    engineVolumeFrom: '', engineVolumeTo: '', fuelType: '', transmission: '', bodyType: '',
    color: '', interiorColor: '', seatCount: '',
  });

  return (
    <div className="space-y-6 pb-28">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <span className="text-xl font-bold font-sans text-slate-800 tracking-tight">Фильтры</span>
        </div>
        <button onClick={reset} className="text-xs text-slate-400 hover:text-rose-500 flex items-center gap-1 transition">
          <RotateCcw className="w-3.5 h-3.5" /> Сбросить
        </button>
      </div>

      {(filters.make || filters.model) && (
        <div className="flex flex-wrap gap-2">
          {filters.make && (
            <div className="inline-flex items-center gap-1.5 bg-slate-900 text-white rounded-lg px-3 py-2 text-xs font-bold shadow-sm">
              <span>{filters.make}</span>
              <button onClick={() => set({ make: '', brandId: null, model: '', modelGroupId: null })} className="hover:text-rose-400 p-0.5"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
          {filters.model && (
            <div className="inline-flex items-center gap-1.5 bg-slate-700 text-white rounded-lg px-3 py-2 text-xs font-bold shadow-sm">
              <span>{filters.model}</span>
              <button onClick={() => set({ model: '', modelGroupId: null })} className="hover:text-rose-400 p-0.5"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <RangeRow label="Год выпуска" from={filters.yearFrom} to={filters.yearTo} onFrom={(v) => set({ yearFrom: v })} onTo={(v) => set({ yearTo: v })} phFrom="2017" phTo="2026" />
        <RangeRow label="Цена, млн ₽" from={filters.priceFrom} to={filters.priceTo} step="0.1" onFrom={(v) => set({ priceFrom: v })} onTo={(v) => set({ priceTo: v })} phFrom="0.5" phTo="6.0" />
        <RangeRow label="Пробег, км" from={filters.mileageFrom} to={filters.mileageTo} onFrom={(v) => set({ mileageFrom: v })} onTo={(v) => set({ mileageTo: v })} phFrom="0" phTo="150000" />
      </div>

      <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white shadow-sm">
        <Section title="Объём двигателя, л" isOpen={expanded === 'engine'} onToggle={() => toggle('engine')}
          summary={(filters.engineVolumeFrom || filters.engineVolumeTo) ? RANGE(filters.engineVolumeFrom, filters.engineVolumeTo) : undefined}>
          <div className="flex items-center gap-2 pt-1">
            <input type="number" step="0.1" value={filters.engineVolumeFrom} onChange={(e) => set({ engineVolumeFrom: e.target.value })} placeholder="1.0" className="w-full bg-stone-100 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white border border-transparent focus:border-sky-300" />
            <span className="text-slate-300">—</span>
            <input type="number" step="0.1" value={filters.engineVolumeTo} onChange={(e) => set({ engineVolumeTo: e.target.value })} placeholder="3.0" className="w-full bg-stone-100 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white border border-transparent focus:border-sky-300" />
          </div>
        </Section>

        <Section title="Тип топлива" isOpen={expanded === 'fuel'} onToggle={() => toggle('fuel')} summary={fuelTypes.find(f => f.value === filters.fuelType)?.display}>
          <Chips items={fuelTypes} value={filters.fuelType} onPick={(v) => set({ fuelType: v })} labelOf={(it) => it.display || it.value} />
        </Section>

        <Section title="Коробка передач" isOpen={expanded === 'gearbox'} onToggle={() => toggle('gearbox')} summary={filters.transmission || undefined}>
          <Chips items={transmissions} value={filters.transmission} onPick={(v) => set({ transmission: v })} />
        </Section>

        <Section title="Тип кузова" isOpen={expanded === 'body'} onToggle={() => toggle('body')} summary={filters.bodyType || undefined}>
          <Chips items={bodyTypes} value={filters.bodyType} onPick={(v) => set({ bodyType: v })} />
        </Section>

        <Section title="Цвет кузова" isOpen={expanded === 'color'} onToggle={() => toggle('color')} summary={filters.color || undefined}>
          <Chips items={colors} value={filters.color} onPick={(v) => set({ color: v })} />
        </Section>

        <Section title="Цвет салона" isOpen={expanded === 'interior'} onToggle={() => toggle('interior')} summary={filters.interiorColor || undefined}>
          <Chips items={interiorColors} value={filters.interiorColor} onPick={(v) => set({ interiorColor: v })} />
        </Section>

        <Section title="Количество мест" isOpen={expanded === 'seats'} onToggle={() => toggle('seats')}
          summary={filters.seatCount ? `${filters.seatCount} мест` : undefined}>
          <Chips items={seatCounts} value={filters.seatCount} onPick={(v) => set({ seatCount: v })}
            labelOf={(it) => it.display || it.value} />
        </Section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-xl max-w-sm mx-auto z-10">
        <button onClick={() => onApply(filters)}
          className="w-full bg-[#050b14] hover:bg-slate-800 text-white font-bold tracking-tight py-4 px-4 rounded-xl text-xs uppercase font-mono shadow-md flex items-center justify-center gap-2 transition">
          {counting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" /> : <Sliders className="w-3.5 h-3.5 text-sky-400" />}
          <span>{matchCount === null ? 'Показать предложения' : `Показать ${matchCount.toLocaleString('ru-RU')} предложений`}</span>
        </button>
      </div>
    </div>
  );
}

function Chips({ items, value, onPick, labelOf }: {
  items: FacetValue[]; value: string; onPick: (v: string) => void; labelOf?: (it: FacetValue) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-2">
      {items.length === 0 && <span className="text-[11px] text-slate-400">Нет доступных значений</span>}
      {items.map((it) => {
        const active = value === it.value;
        return (
          <button key={it.value} type="button" onClick={() => onPick(active ? '' : it.value)}
            className={`text-xs py-2 px-3 rounded-lg border transition font-semibold ${active ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-sky-300'}`}>
            {labelOf ? labelOf(it) : it.value}
            <span className={`ml-1 ${active ? 'text-slate-300' : 'text-slate-400'}`}>{it.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function Section({ title, summary, isOpen, onToggle, children }: {
  title: string; summary?: string; isOpen: boolean; onToggle: () => void; children: ReactNode;
}) {
  return (
    <div className="p-4 space-y-2">
      <button onClick={onToggle} className="w-full flex items-center justify-between text-left font-bold text-slate-800 text-sm">
        <span>{title}</span>
        <span className="flex items-center gap-2">
          {summary && <span className="text-xs text-slate-400 font-mono font-normal">{summary}</span>}
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {isOpen && children}
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
