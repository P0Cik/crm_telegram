import React, { useState } from 'react';
import { Search, ArrowLeft } from 'lucide-react';

export interface ModelItem {
  id: number;
  name: string;
  model_group?: string;
  brand_id: number;
  count: number;
}

interface ModelsSelectorProps {
  brand: string;
  models: ModelItem[];
  onBack: () => void;
  onSelectModel: (model: string) => void;
  brandListingsCount: number;
}

export default function ModelsSelector({
  brand = 'BMW',
  models = [],
  onBack,
  onSelectModel,
  brandListingsCount
}: ModelsSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredModels = models.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.model_group && m.model_group.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-5 flex flex-col h-full min-h-[500px]">
      {/* Navigation Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-xl transition active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 text-slate-800" />
        </button>
        <span className="text-xl font-bold font-sans text-slate-850 tracking-tight">
          Модели {brand}
        </span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
          <Search className="w-4 h-4 text-slate-400" />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск модели"
          className="w-full bg-stone-100 placeholder-slate-400 text-slate-850 rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none border border-transparent focus:border-stone-200 focus:bg-white transition"
        />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 font-sans">Линейка моделей</h3>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono">
          Популярные
        </span>
      </div>

      {/* Model Selection List */}
      <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[300px] bg-white rounded-2xl border border-slate-100 shadow-sm px-4">
        {filteredModels.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">Модели не найдены</div>
        ) : (
          filteredModels.map((model) => (
            <button
              key={model.id}
              onClick={() => onSelectModel(model.name)}
              className="w-full py-4 text-left font-bold text-slate-850 text-sm hover:text-sky-600 transition flex items-center justify-between group"
            >
              <div className="flex flex-col">
                <span>{model.name}</span>
                {model.model_group && model.model_group !== model.name && (
                  <span className="text-[10px] text-slate-400 font-normal">{model.model_group}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-mono">
                  {model.count.toLocaleString()}
                </span>
                <span className="w-5 h-5 rounded-full bg-stone-50 group-hover:bg-sky-50 flex items-center justify-center text-[10px] text-slate-400 group-hover:text-sky-600 font-black transition">
                  &gt;
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer dynamic search action button */}
      <div className="pt-2">
        <button
          onClick={() => onSelectModel('')}
          className="w-full bg-[#050b14] hover:bg-[#111e2f] active:scale-[0.99] transition text-white py-4 rounded-xl text-xs font-bold shadow-md tracking-wider uppercase font-mono mt-auto"
        >
          Показать {brandListingsCount.toLocaleString()} объявлений
        </button>
      </div>
    </div>
  );
}
