export function CardSkeleton() {
  return (
    <div className="card animate-fade-in-up">
      <div className="h-56 skeleton rounded-t-2xl" />
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <div className="h-6 skeleton rounded-lg w-3/4" />
          <div className="h-4 skeleton rounded w-1/2" />
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="space-y-2">
            <div className="h-8 skeleton rounded w-24" />
            <div className="h-3 skeleton rounded w-16" />
          </div>
          <div className="h-10 skeleton rounded-xl w-28" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div 
          key={i} 
          className="flex items-center p-4 bg-gray-50 rounded-xl animate-fade-in-up"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <div className="w-12 h-12 skeleton rounded-xl mr-4" />
          <div className="flex-1 space-y-2">
            <div className="h-5 skeleton rounded w-3/4" />
            <div className="h-4 skeleton rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}