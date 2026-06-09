import React, { useState } from 'react';
import { Search, ArrowLeft } from 'lucide-react';

export interface BrandItem {
  id: number;
  name: string;
  name_ru?: string;
  count: number;
}

interface MakesSelectorProps {
  brands: BrandItem[];
  onBack: () => void;
  onSelectBrand: (brand: string) => void;
  totalListingsCount: number;
}

const getBrandLogo = (name: string): string => {
  const logos: Record<string, string> = {
    'BMW': '🇩🇪',
    'Audi': '🇩🇪',
    'Chevrolet': '🇺🇸',
    'Ford': '🇺🇸',
    'Geely': '🇨🇳',
    'Mercedes-Benz': '🇩🇪',
    'Kia': '🇰🇷',
    'Hyundai': '🇰🇷',
    'Lexus': '🇯🇵',
    'Genesis': '🇰🇷',
    'Toyota': '🇯🇵',
    'Honda': '🇯🇵',
    'Nissan': '🇯🇵',
    'Porsche': '🇩🇪',
    'Volkswagen': '🇩🇪',
    'Volvo': '🇸🇪',
    'Land Rover': '🇬🇧',
    'Jaguar': '🇬🇧',
    'Renault': '🇫🇷',
    'Peugeot': '🇫🇷',
    'Chery': '🇨🇳',
    'Haval': '🇨🇳',
    'Changan': '🇨🇳',
    'Exeed': '🇨🇳',
    'Omoda': '🇨🇳',
    'Mazda': '🇯🇵',
    'Subaru': '🇯🇵',
    'Mitsubishi': '🇯🇵',
    'Infiniti': '🇯🇵',
    'MINI': '🇬🇧',
    'Jeep': '🇺🇸',
    'Cadillac': '🇺🇸',
    'Tesla': '🇺🇸'
  };
  return logos[name] || '🚗';
};

export default function MakesSelector({
  brands,
  onBack,
  onSelectBrand,
  totalListingsCount
}: MakesSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.name_ru && b.name_ru.toLowerCase().includes(searchQuery.toLowerCase()))
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
                <span className="text-xl select-none">{getBrandLogo(brand.name)}</span>
                <span className="font-bold text-slate-850 text-sm group-hover:text-sky-600 transition">
                  {brand.name} {brand.name_ru ? <span className="text-xs text-slate-400 font-normal ml-1">({brand.name_ru})</span> : null}
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
