import { StatusBadge } from '@/components/Badges';
import { Filters, useFilteredProperties } from '@/components/Filters';
import { CardSkeleton } from '@/components/Skeleton';
import type { Property } from '@/types';
import { Link } from 'react-router-dom';

export function PropertiesArea({ properties, loading }: { properties: Property[]; loading: boolean }) {
  const { filters, setFilters, filtered } = useFilteredProperties(properties);
  
  if (loading) {
    return (
      <div className="properties-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <Filters value={filters} onChange={setFilters} />
      
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum imóvel encontrado</h3>
          <p className="text-gray-600">Tente ajustar os filtros ou volte mais tarde para ver novos imóveis.</p>
        </div>
      ) : (
        <div className="properties-grid">
          {filtered.map((p, index) => (
            <PropertyCard key={p.id} property={p} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}

function PropertyCard({ property, index }: { property: Property; index: number }) {
  return (
    <div 
      className={`property-card card card-interactive animate-fade-in-up animate-delay-${(index + 1) * 100}`}
    >
      <div className="relative overflow-hidden">
        <img
          src={property.imageUrl || 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=800&q=80'}
          alt={property.title}
          className="property-image h-56 w-full object-cover transition-transform duration-500"
        />
        <div className="absolute top-4 right-4">
          <StatusBadge status={property.status} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      </div>
      
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="font-bold text-xl text-gray-900 leading-tight">
            {property.title}
          </h3>
          <div className="flex items-center text-gray-600">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm">{property.location}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              €{Number(property.price ?? 0).toLocaleString('pt-PT')}
            </div>
            <div className="text-xs text-gray-500">
              {property.status === 'for_rent' ? 'por mês' : ''}
            </div>
          </div>
          
          <Link 
            to={`/property/${property.id}`}
            className="btn btn-primary text-sm px-4 py-2 group"
          >
            <span>Ver Detalhes</span>
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        {property.description && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
            {property.description}
          </p>
        )}
      </div>
    </div>
  );
}