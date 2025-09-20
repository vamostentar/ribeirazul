import type { Property } from '@/types';
import { useMemo, useState } from 'react';

export type FiltersState = {
  q: string;
  status: 'all' | 'for_sale' | 'for_rent' | 'sold';
};

export function useFilteredProperties(properties: Property[]) {
  const [filters, setFilters] = useState<FiltersState>({ q: '', status: 'all' });
  const filtered = useMemo(() => {
    const term = filters.q.trim().toLowerCase();
    return properties.filter((p) => {
      const matchesTerm = term
        ? [p.title, p.location, p.description].some((f) => (f || '').toLowerCase().includes(term))
        : true;
      const matchesStatus = filters.status === 'all' ? true : p.status === filters.status;
      return matchesTerm && matchesStatus;
    });
  }, [properties, filters]);
  return { filters, setFilters, filtered };
}

export function Filters({ value, onChange }: { value: FiltersState; onChange: (f: FiltersState) => void }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50">
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
        <div className="flex-1">
          <div className="relative">
            <input
              value={value.q}
              onChange={(e) => onChange({ ...value, q: e.target.value })}
              placeholder="Pesquisar por título, localização ou descrição..."
              className="input pl-12 w-full"
            />
            <svg className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        <div className="relative lg:w-64">
          <select
            value={value.status}
            onChange={(e) => onChange({ ...value, status: e.target.value as FiltersState['status'] })}
            className="input appearance-none w-full pr-10"
          >
            <option value="all">Todos os imóveis</option>
            <option value="for_sale">À venda</option>
            <option value="for_rent">Para alugar</option>
            <option value="sold">Vendido</option>
          </select>
          <svg className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <button 
          onClick={() => onChange({ q: '', status: 'all' })}
          className="btn btn-outline px-6 py-3 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Limpar
        </button>
      </div>
    </div>
  );
}