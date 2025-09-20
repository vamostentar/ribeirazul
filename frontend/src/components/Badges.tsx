export function StatusBadge({ status }: { status: 'for_sale' | 'for_rent' | 'sold' }) {
  const config: Record<string, { classes: string; labels: string; icon: React.ReactNode }> = {
    for_sale: {
      classes: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      labels: 'À venda',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    },
    for_rent: {
      classes: 'bg-amber-100 text-amber-700 border-amber-200',
      labels: 'Para alugar',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      )
    },
    sold: {
      classes: 'bg-rose-100 text-rose-700 border-rose-200',
      labels: 'Vendido',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    },
  };

  const { classes, labels, icon } = config[status];
  
  return (
    <span className={`badge border ${classes} flex items-center gap-1.5`}>
      {icon}
      {labels}
    </span>
  );
}

export function AdminStatusBadge({ status }: { status: 'ACTIVE' | 'PENDING' | 'INACTIVE' }) {
  const config: Record<string, { classes: string; labels: string; icon: React.ReactNode }> = {
    ACTIVE: {
      classes: 'bg-green-100 text-green-700 border-green-200',
      labels: 'Ativo',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    PENDING: {
      classes: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      labels: 'Pendente',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    INACTIVE: {
      classes: 'bg-red-100 text-red-700 border-red-200',
      labels: 'Inativo',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  };

  const { classes, labels, icon } = config[status];
  
  return (
    <span className={`badge border ${classes} flex items-center gap-1.5`}>
      {icon}
      {labels}
    </span>
  );
}