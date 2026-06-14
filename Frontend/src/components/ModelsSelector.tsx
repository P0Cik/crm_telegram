import { useState } from 'react';
import { Search, ArrowLeft, ChevronRight } from 'lucide-react';
import { CatalogOption } from '../types';

interface ModelsSelectorProps {
  brand: string;
  groups: CatalogOption[];
  onBack: () => void;
  onSelectGroup: (group: CatalogOption | null) => void;
  brandListingsCount: number;
}

export default function ModelsSelector({
  brand,
  groups = [],
  onBack,
  onSelectGroup,
  brandListingsCount,
}: ModelsSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-5 flex flex-col h-full min-h-[500px]">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition active:scale-95">
          <ArrowLeft className="w-5 h-5 text-slate-800" />
        </button>
        <span className="text-xl font-bold font-sans text-slate-800 tracking-tight">Модели {brand}</span>
      </div>

      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
          <Search className="w-4 h-4 text-slate-400" />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск модели"
          className="w-full bg-stone-100 placeholder-slate-400 text-slate-800 rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none border border-transparent focus:border-sky-300 focus:bg-white transition"
        />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 font-sans">Линейка моделей</h3>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono">{filtered.length}</span>
      </div>

      <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[330px] bg-white rounded-2xl border border-slate-100 shadow-sm px-1">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">Модели не найдены</div>
        ) : (
          filtered.map((group) => (
            <button
              key={group.id}
              onClick={() => onSelectGroup(group)}
              className="w-full py-3.5 px-3 text-left text-slate-800 text-sm hover:bg-slate-50 rounded-xl transition flex items-center justify-between group"
            >
              <span className="font-bold group-hover:text-sky-600 transition">{group.name}</span>
              <div className="flex items-center gap-2">
                {typeof group.count === 'number' && (
                  <span className="text-xs text-slate-400 font-mono">{group.count.toLocaleString('ru-RU')}</span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 transition" />
              </div>
            </button>
          ))
        )}
      </div>

      <div className="pt-1">
        <button
          onClick={() => onSelectGroup(null)}
          className="w-full bg-[#050b14] hover:bg-[#111e2f] active:scale-[0.99] transition text-white py-4 rounded-xl text-xs font-bold shadow-md tracking-wider uppercase font-mono"
        >
          Все модели {brand} {brandListingsCount ? `· ${brandListingsCount.toLocaleString('ru-RU')}` : ''}
        </button>
      </div>
    </div>
  );
}
