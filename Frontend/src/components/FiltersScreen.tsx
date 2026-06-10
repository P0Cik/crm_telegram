import React, { useState, useEffect } from 'react';
import { ArrowLeft, X, ChevronDown, ChevronUp, Sliders } from 'lucide-react';
import { SearchFilters, Car } from '../types';

interface FiltersScreenProps {
  initialFilters: SearchFilters;
  onBack: () => void;
  onApply: (filters: SearchFilters) => void;
  catalog: Car[];
}

export default function FiltersScreen({
  initialFilters,
  onBack,
  onApply,
  catalog
}: FiltersScreenProps) {
  const [filters, setFilters] = useState<SearchFilters>({ ...initialFilters });
  
  // Collapse states for filter dropdown section clusters
  const [expandedSection, setExpandedSection] = useState<string | null>('engine');

  // Multi-option catalog choices
  const FUEL_TYPES = ['Все виды', 'бензин', 'дизель', 'гибрид', 'электро'];
  const GEARBOX_TYPES = ['Все коробки', 'автомат', 'робот', 'механика'];
  const COLORS = ['Все цвета', 'белый', 'черный', 'серый', 'синий', 'красный'];

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const handleClearModel = () => {
    setFilters(prev => ({ ...prev, model: '' }));
  };

  const handleClearMake = () => {
    setFilters(prev => ({ ...prev, make: '', model: '' }));
  };

  const handleConditionChange = (condition: 'all' | 'new' | 'used') => {
    setFilters(prev => ({ ...prev, condition }));
  };

  // Live count filtering simulation based on active parameters
  const [matchingCount, setMatchingCount] = useState(0);

  useEffect(() => {
    const matched = catalog.filter(car => {
      // Make / Model checks
      if (filters.make && !['Все марки', 'Любая марка', ''].includes(filters.make) && car.make.toLowerCase() !== filters.make.toLowerCase()) return false;
      if (filters.model && !['Все модели', 'Любая модель', ''].includes(filters.model) && !car.model.toLowerCase().includes(filters.model.toLowerCase())) return false;

      // Condition checking
      if (filters.condition === 'new' && car.mileage > 100) return false;
      if (filters.condition === 'used' && car.mileage <= 100) return false;

      // Numerical range filterings
      const numYearFrom = parseInt(filters.yearFrom) || 0;
      const numYearTo = parseInt(filters.yearTo) || 9999;
      if (car.year < numYearFrom || car.year > numYearTo) return false;

      // Price range filterings
      const numPriceFrom = parseFloat(filters.priceFrom) || 0;
      const numPriceTo = parseFloat(filters.priceTo) || 9999;
      const priceRubMillion = car.priceRub / 1000000;
      if (numPriceFrom > 0 && priceRubMillion < numPriceFrom) return false;
      if (numPriceTo < 9999 && priceRubMillion > numPriceTo) return false;

      // Engine parameters
      const numVolFrom = parseFloat(filters.engineVolumeFrom) || 0;
      const numVolTo = parseFloat(filters.engineVolumeTo) || 99;
      if (numVolFrom > 0 && car.engineVolume < numVolFrom) return false;
      if (numVolTo < 99 && car.engineVolume > numVolTo) return false;

      // Categorical string matches
      if (filters.fuelType && filters.fuelType !== 'Все виды' && car.fuelType !== filters.fuelType) return false;
      if (filters.gearbox && filters.gearbox !== 'Все коробки' && car.gearbox !== filters.gearbox) return false;
      if (filters.color && filters.color !== 'Все цвета' && car.color !== filters.color) return false;

      return true;
    });

    setMatchingCount(matched.length);
  }, [filters, catalog]);

  return (
    <div className="space-y-6 pb-24">
      {/* Back navigation header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-xl transition active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 text-slate-800" />
        </button>
        <span className="text-xl font-bold font-sans text-slate-850 tracking-tight">Параметры</span>
      </div>

      {/* Condition Toggle Switches (Все, Новые, Поддержанные) */}
      <div className="bg-stone-100 p-1 rounded-xl grid grid-cols-3 gap-1">
        {(['all', 'new', 'used'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => handleConditionChange(type)}
            className={`py-2 px-1 text-center font-bold text-xs rounded-lg transition duration-150 ${
              filters.condition === type
                ? 'bg-slate-990 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {type === 'all' && 'Все'}
            {type === 'new' && 'Новые'}
            {type === 'used' && 'С пробегом'}
          </button>
        ))}
      </div>

      {/* Selected Brands / Models chips wrapper */}
      {(filters.make || filters.model) && (
        <div className="flex flex-wrap gap-2">
          {filters.make && (
            <div className="inline-flex items-center gap-1.5 bg-slate-900 text-white rounded-lg px-3 py-2 text-xs font-bold shadow-sm">
              <span>{filters.make}</span>
              <button onClick={handleClearMake} className="hover:text-red-400 p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {filters.model && (
            <div className="inline-flex items-center gap-1.5 bg-slate-900 text-white rounded-lg px-3 py-2 text-xs font-bold shadow-sm">
              <span>{filters.model}</span>
              <button onClick={handleClearModel} className="hover:text-red-400 p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Range filter inputs form */}
      <div className="space-y-4">
        {/* Год (от - до) */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 block font-sans">Год выпуска</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono w-4">от</span>
            <input
              type="number"
              value={filters.yearFrom}
              onChange={(e) => setFilters(p => ({ ...p, yearFrom: e.target.value }))}
              placeholder="e.g. 2017"
              className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm outline-none text-slate-800 focus:bg-white border border-transparent focus:border-stone-200"
            />
            <span className="text-xs text-slate-400 font-mono w-4">до</span>
            <input
              type="number"
              value={filters.yearTo}
              onChange={(e) => setFilters(p => ({ ...p, yearTo: e.target.value }))}
              placeholder="e.g. 2026"
              className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm outline-none text-slate-800 focus:bg-white border border-transparent focus:border-stone-200"
            />
          </div>
        </div>

        {/* Цена (от - до млн руб) */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 block font-sans">Цена (в млн ₽)</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono w-4">от</span>
            <input
              type="number"
              step="0.1"
              value={filters.priceFrom}
              onChange={(e) => setFilters(p => ({ ...p, priceFrom: e.target.value }))}
              placeholder="0.0"
              className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm outline-none text-slate-800 focus:bg-white border border-transparent focus:border-stone-200"
            />
            <span className="text-xs text-slate-400 font-mono w-4">до</span>
            <input
              type="number"
              step="0.1"
              value={filters.priceTo}
              onChange={(e) => setFilters(p => ({ ...p, priceTo: e.target.value }))}
              placeholder="5.5"
              className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm outline-none text-slate-800 focus:bg-white border border-transparent focus:border-stone-200"
            />
          </div>
        </div>

        {/* Accordions for specific details with custom select states */}
        <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white shadow-sm">
          {/* Engine Parameters */}
          <div className="p-4 space-y-3">
            <button
              onClick={() => toggleSection('engine')}
              className="w-full flex items-center justify-between text-left font-bold text-slate-800 text-sm"
            >
              <span>Двигатель и мощность</span>
              {expandedSection === 'engine' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {expandedSection === 'engine' && (
              <div className="pt-2.5 space-y-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono w-14">Объем от/до</span>
                  <input
                    type="number"
                    step="0.1"
                    value={filters.engineVolumeFrom}
                    onChange={(e) => setFilters(p => ({ ...p, engineVolumeFrom: e.target.value }))}
                    placeholder="1.0"
                    className="w-full bg-stone-100 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={filters.engineVolumeTo}
                    onChange={(e) => setFilters(p => ({ ...p, engineVolumeTo: e.target.value }))}
                    placeholder="3.0"
                    className="w-full bg-stone-100 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Fuel type selection list */}
          <div className="p-4 space-y-3">
            <button
              onClick={() => toggleSection('fuel')}
              className="w-full flex items-center justify-between text-left font-bold text-slate-800 text-sm"
            >
              <span>Тип топлива</span>
              <span className="text-xs text-slate-400 font-mono">{filters.fuelType}</span>
            </button>

            {expandedSection === 'fuel' && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {FUEL_TYPES.map((fuel) => (
                  <button
                    key={fuel}
                    type="button"
                    onClick={() => setFilters(p => ({ ...p, fuelType: fuel }))}
                    className={`text-xs py-2 px-3.5 rounded-lg border transition font-bold ${
                      filters.fuelType === fuel
                        ? 'bg-slate-900 border-slate-905 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350'
                    }`}
                  >
                    {fuel === 'Все виды' ? 'Все виды' : fuel.charAt(0).toUpperCase() + fuel.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Transmission types */}
          <div className="p-4 space-y-3">
            <button
              onClick={() => toggleSection('gearbox')}
              className="w-full flex items-center justify-between text-left font-bold text-slate-800 text-sm"
            >
              <span>Коробка передач</span>
              <span className="text-xs text-slate-400 font-mono">{filters.gearbox}</span>
            </button>

            {expandedSection === 'gearbox' && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {GEARBOX_TYPES.map((box) => (
                  <button
                    key={box}
                    type="button"
                    onClick={() => setFilters(p => ({ ...p, gearbox: box }))}
                    className={`text-xs py-2 px-3.5 rounded-lg border transition font-bold ${
                      filters.gearbox === box
                        ? 'bg-slate-900 border-slate-905 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350'
                    }`}
                  >
                    {box === 'Все коробки' ? 'Все коробки' : box.charAt(0).toUpperCase() + box.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Colors Selection Grid */}
          <div className="p-4 space-y-3">
            <button
              onClick={() => toggleSection('color')}
              className="w-full flex items-center justify-between text-left font-bold text-slate-800 text-sm"
            >
              <span>Цветовая гамма</span>
              <span className="text-xs text-slate-400 font-mono">{filters.color}</span>
            </button>

            {expandedSection === 'color' && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setFilters(p => ({ ...p, color: col }))}
                    className={`text-xs py-2 px-3.5 rounded-lg border transition font-bold ${
                      filters.color === col
                        ? 'bg-slate-900 border-slate-905 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350'
                    }`}
                  >
                    {col.charAt(0).toUpperCase() + col.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating search match CTA button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-xl max-w-sm mx-auto z-10">
        <button
          onClick={() => onApply(filters)}
          className="w-full bg-[#050b14] hover:bg-slate-800 text-white font-bold tracking-tight py-4 px-4 rounded-xl text-xs uppercase font-mono shadow-md flex items-center justify-center gap-2 transition"
        >
          <Sliders className="w-3.5 h-3.5 text-sky-400" />
          <span>Показать {matchingCount} объявлений</span>
        </button>
      </div>
    </div>
  );
}
