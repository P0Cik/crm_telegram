import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { Subscription } from '../types';

interface EditSubscriptionScreenProps {
  subscription: Subscription;
  onBack: () => void;
  onSave: (updated: Subscription) => Promise<void> | void;
}

export default function EditSubscriptionScreen({
  subscription,
  onBack,
  onSave,
}: EditSubscriptionScreenProps) {
  // Local editing state initialized from the subscription
  const [make] = useState(subscription.make);
  const [model] = useState(subscription.model);
  const [condition, setCondition] = useState<'all' | 'new' | 'used'>(
    (subscription.condition as 'all' | 'new' | 'used') || 'all'
  );
  const [yearFrom, setYearFrom] = useState(subscription.yearFrom?.toString() || '');
  const [yearTo, setYearTo] = useState(subscription.yearTo?.toString() || '');
  const [priceFrom, setPriceFrom] = useState(
    subscription.priceRubFrom ? (subscription.priceRubFrom / 1000000).toString() : ''
  );
  const [priceTo, setPriceTo] = useState(
    subscription.priceRubTo ? (subscription.priceRubTo / 1000000).toString() : ''
  );
  const [engineVolumeFrom, setEngineVolumeFrom] = useState(
    subscription.engineVolumeFrom?.toString() || ''
  );
  const [engineVolumeTo, setEngineVolumeTo] = useState(
    subscription.engineVolumeTo?.toString() || ''
  );
  const [powerFrom, setPowerFrom] = useState(subscription.powerFrom?.toString() || '');
  const [powerTo, setPowerTo] = useState(subscription.powerTo?.toString() || '');
  const [fuelType, setFuelType] = useState(subscription.fuelType || 'Все виды');
  const [gearbox, setGearbox] = useState(subscription.gearbox || 'Все коробки');
  const [driveType, setDriveType] = useState(subscription.driveType || 'Все приводы');
  const [wheelPosition, setWheelPosition] = useState(subscription.wheelPosition || 'Все варианты');
  const [color, setColor] = useState(subscription.color || 'Все цвета');

  const [expandedSection, setExpandedSection] = useState<string | null>('engine');
  const [isSaving, setIsSaving] = useState(false);

  // Multi-option catalog choices (same as FiltersScreen)
  const FUEL_TYPES = ['Все виды', 'бензин', 'дизель', 'гибрид', 'электро'];
  const GEARBOX_TYPES = ['Все коробки', 'автомат', 'робот', 'механика'];
  const DRIVETRAIN_TYPES = ['Все приводы', 'передний', 'задний', 'полный'];
  const COLORS = ['Все цвета', 'белый', 'черный', 'серый', 'синий', 'красный'];
  const WHEEL_POSITIONS = ['Все варианты', 'левый', 'правый'];

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updated: Subscription = {
      id: subscription.id,
      make,
      model,
      yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
      yearTo: yearTo ? parseInt(yearTo) : undefined,
      priceRubFrom: priceFrom ? parseFloat(priceFrom) * 1000000 : undefined,
      priceRubTo: priceTo ? parseFloat(priceTo) * 1000000 : undefined,
      engineVolumeFrom: engineVolumeFrom ? parseFloat(engineVolumeFrom) : undefined,
      engineVolumeTo: engineVolumeTo ? parseFloat(engineVolumeTo) : undefined,
      powerFrom: powerFrom ? parseInt(powerFrom) : undefined,
      powerTo: powerTo ? parseInt(powerTo) : undefined,
      fuelType: fuelType !== 'Все виды' ? fuelType : undefined,
      gearbox: gearbox !== 'Все коробки' ? gearbox : undefined,
      wheelPosition: wheelPosition !== 'Все варианты' ? wheelPosition : undefined,
      driveType: driveType !== 'Все приводы' ? driveType : undefined,
      color: color !== 'Все цвета' ? color : undefined,
      country: subscription.country,
      condition: condition !== 'all' ? condition : undefined,
    };
    try {
      await onSave(updated);
    } finally {
      setIsSaving(false);
    }
  };

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
        <div>
          <span className="text-xl font-bold font-sans text-slate-850 tracking-tight">Редактирование подписки</span>
          <p className="text-[11px] text-slate-400 font-mono">{make} {model}</p>
        </div>
      </div>

      {/* Condition Toggle Switches */}
      <div className="bg-stone-100 p-1 rounded-xl grid grid-cols-3 gap-1">
        {(['all', 'new', 'used'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setCondition(type)}
            className={`py-2 px-1 text-center font-bold text-xs rounded-lg transition duration-150 ${
              condition === type
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

      {/* Selected Brand / Model chips */}
      <div className="flex flex-wrap gap-2">
        <div className="inline-flex items-center gap-1.5 bg-slate-900 text-white rounded-lg px-3 py-2 text-xs font-bold shadow-sm">
          <span>{make}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 bg-slate-900 text-white rounded-lg px-3 py-2 text-xs font-bold shadow-sm">
          <span>{model}</span>
        </div>
      </div>

      {/* Range filter inputs form */}
      <div className="space-y-4">
        {/* Год (от - до) */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 block font-sans">Год выпуска</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono w-4">от</span>
            <input
              type="number"
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
              placeholder="e.g. 2017"
              className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm outline-none text-slate-800 focus:bg-white border border-transparent focus:border-stone-200"
            />
            <span className="text-xs text-slate-400 font-mono w-4">до</span>
            <input
              type="number"
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
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
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
              placeholder="0.0"
              className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm outline-none text-slate-800 focus:bg-white border border-transparent focus:border-stone-200"
            />
            <span className="text-xs text-slate-400 font-mono w-4">до</span>
            <input
              type="number"
              step="0.1"
              value={priceTo}
              onChange={(e) => setPriceTo(e.target.value)}
              placeholder="5.5"
              className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm outline-none text-slate-800 focus:bg-white border border-transparent focus:border-stone-200"
            />
          </div>
        </div>

        {/* Accordions for specific details */}
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
                    value={engineVolumeFrom}
                    onChange={(e) => setEngineVolumeFrom(e.target.value)}
                    placeholder="1.0"
                    className="w-full bg-stone-100 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={engineVolumeTo}
                    onChange={(e) => setEngineVolumeTo(e.target.value)}
                    placeholder="3.0"
                    className="w-full bg-stone-100 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono w-14">Мощность л.с.</span>
                  <input
                    type="number"
                    value={powerFrom}
                    onChange={(e) => setPowerFrom(e.target.value)}
                    placeholder="100"
                    className="w-full bg-stone-100 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                  <input
                    type="number"
                    value={powerTo}
                    onChange={(e) => setPowerTo(e.target.value)}
                    placeholder="300"
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
              <span className="text-xs text-slate-400 font-mono">{fuelType}</span>
            </button>

            {expandedSection === 'fuel' && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {FUEL_TYPES.map((fuel) => (
                  <button
                    key={fuel}
                    type="button"
                    onClick={() => setFuelType(fuel)}
                    className={`text-xs py-2 px-3.5 rounded-lg border transition font-bold ${
                      fuelType === fuel
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
              <span className="text-xs text-slate-400 font-mono">{gearbox}</span>
            </button>

            {expandedSection === 'gearbox' && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {GEARBOX_TYPES.map((box) => (
                  <button
                    key={box}
                    type="button"
                    onClick={() => setGearbox(box)}
                    className={`text-xs py-2 px-3.5 rounded-lg border transition font-bold ${
                      gearbox === box
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

          {/* Drivetrain options */}
          <div className="p-4 space-y-3">
            <button
              onClick={() => toggleSection('drive')}
              className="w-full flex items-center justify-between text-left font-bold text-slate-800 text-sm"
            >
              <span>Привод трансмиссии</span>
              <span className="text-xs text-slate-400 font-mono">{driveType}</span>
            </button>

            {expandedSection === 'drive' && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {DRIVETRAIN_TYPES.map((drive) => (
                  <button
                    key={drive}
                    type="button"
                    onClick={() => setDriveType(drive)}
                    className={`text-xs py-2 px-3.5 rounded-lg border transition font-bold ${
                      driveType === drive
                        ? 'bg-slate-900 border-slate-905 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350'
                    }`}
                  >
                    {drive === 'Все приводы' ? 'Все приводы' : drive.charAt(0).toUpperCase() + drive.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Steering wheel hand */}
          <div className="p-4 space-y-3">
            <button
              onClick={() => toggleSection('wheel')}
              className="w-full flex items-center justify-between text-left font-bold text-slate-800 text-sm"
            >
              <span>Расположение руля</span>
              <span className="text-xs text-slate-400 font-mono">{wheelPosition}</span>
            </button>

            {expandedSection === 'wheel' && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {WHEEL_POSITIONS.map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setWheelPosition(pos)}
                    className={`text-xs py-2 px-3.5 rounded-lg border transition font-bold ${
                      wheelPosition === pos
                        ? 'bg-slate-900 border-slate-905 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350'
                    }`}
                  >
                    {pos === 'Все варианты' ? 'Любой руль' : pos.toUpperCase() + ' руль'}
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
              <span className="text-xs text-slate-400 font-mono">{color}</span>
            </button>

            {expandedSection === 'color' && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setColor(col)}
                    className={`text-xs py-2 px-3.5 rounded-lg border transition font-bold ${
                      color === col
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

      {/* Floating Save CTA button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-xl max-w-sm mx-auto z-10">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#050b14] hover:bg-slate-800 text-white font-bold tracking-tight py-4 px-4 rounded-xl text-xs uppercase font-mono shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5 text-sky-400" />
          <span>{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
        </button>
      </div>
    </div>
  );
}
