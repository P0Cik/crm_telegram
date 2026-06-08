import React, { useState } from 'react';
import { Search, ArrowLeft } from 'lucide-react';

interface MakesSelectorProps {
  onBack: () => void;
  onSelectBrand: (brand: string) => void;
  totalListingsCount: number;
}

const BRANDS = [
  { name: 'BMW', logo: '🇩🇪', count: 27788 },
  { name: 'Audi', logo: '🇩🇪', count: 18940 },
  { name: 'Chevrolet', logo: '🇺🇸', count: 15450 },
  { name: 'Ford', logo: '🇺🇸', count: 12200 },
  { name: 'Geely', logo: '🇨🇳', count: 9810 },
  { name: 'Mercedes-Benz', logo: '🇩🇪', count: 34100 },
  { name: 'Kia', logo: '🇰🇷', count: 58900 },
  { name: 'Hyundai', logo: '🇰🇷', count: 64500 },
  { name: 'Lexus', logo: '🇯🇵', count: 8700 },
  { name: 'Genesis', logo: '🇰🇷', count: 19800 }
];

export default function MakesSelector({
  onBack,
  onSelectBrand,
  totalListingsCount
}: MakesSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBrands = BRANDS.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
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
        <span className="text-xl font-bold font-sans text-slate-800 tracking-tight">Марки</span>
      </div>

      {/* Styled Search Bar */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
          <Search className="w-4 h-4 text-slate-400" />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск марки"
          className="w-full bg-stone-100 placeholder-slate-400 text-slate-800 rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none border border-transparent focus:border-stone-200 focus:bg-white transition"
        />
      </div>

      {/* Popular category label */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 font-sans">Популярные марки</h3>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono">Корея экспорт</span>
      </div>

      {/* Brands List */}
      <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[300px] bg-white rounded-2xl border border-slate-100 shadow-sm px-4">
        {filteredBrands.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">Марки не найдены</div>
        ) : (
          filteredBrands.map((brand) => (
            <button
              key={brand.name}
              onClick={() => onSelectBrand(brand.name)}
              className="w-full py-4 flex items-center justify-between text-left group hover:bg-slate-20"
            >
              <div className="flex items-center gap-3.5">
                <span className="text-xl select-none">{brand.logo}</span>
                <span className="font-bold text-slate-850 text-sm group-hover:text-sky-600 transition">
                  {brand.name}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {brand.count.toLocaleString()} предл.
              </span>
            </button>
          ))
        )}
      </div>

      {/* Footer dynamic filter search action button */}
      <div className="pt-2">
        <button
          onClick={() => onSelectBrand('')}
          className="w-full bg-[#050b14] hover:bg-[#111e2f] active:scale-[0.99] transition text-white py-4 rounded-xl text-xs font-bold shadow-md tracking-wider uppercase font-mono mt-auto"
        >
          Показать {totalListingsCount.toLocaleString()} объявлений
        </button>
      </div>
    </div>
  );
}
