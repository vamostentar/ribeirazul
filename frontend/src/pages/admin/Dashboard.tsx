import { useDashboardStats } from '@/api/admin-queries';
import AdminLayout from '@/components/admin/AdminLayout';
import StatCard from '@/components/admin/StatCard';
import { ListSkeleton } from '@/components/Skeleton';
import {
  AlertCircle,
  Building,
  Eye,
  Users
} from 'lucide-react';

export default function Dashboard() {
  const { data: dashboardData, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <ListSkeleton rows={4} />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm font-semibold mb-1">Erro ao carregar dados do dashboard</p>
          <p className="text-red-700 text-sm">Verifique a conexão com os serviços.</p>
        </div>
      </AdminLayout>
    );
  }

  const stats = {
    totalProperties: dashboardData?.properties.total || 0,
    activeUsers: dashboardData?.users.active || 0,
    monthlyViews: dashboardData?.properties.monthlyViews || 0,
    pendingApprovals: dashboardData?.pendingApprovals || 0
  };

  // TODO: Implementar APIs para dados recentes
  const recentProperties: any[] = [];
  const recentActivity: any[] = [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={Building} 
            title="Total de Propriedades" 
            value={stats.totalProperties.toLocaleString()} 
            change={12}
            color="bg-blue-500"
          />
          <StatCard 
            icon={Users} 
            title="Utilizadores Ativos" 
            value={stats.activeUsers.toLocaleString()} 
            change={8}
            color="bg-green-500"
          />
          <StatCard 
            icon={Eye} 
            title="Visualizações/Mês" 
            value={stats.monthlyViews.toLocaleString()} 
            change={-3}
            color="bg-purple-500"
          />
          <StatCard 
            icon={AlertCircle} 
            title="Aprovações Pendentes" 
            value={stats.pendingApprovals} 
            color="bg-orange-500"
          />
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Propriedades Recentes</h3>
            {recentProperties.length > 0 ? (
              <div className="space-y-3">
                {recentProperties.map(property => (
                  <div key={property.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{property.title}</p>
                      <p className="text-xs text-gray-500">{property.type} • €{property.price}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      property.status === 'Ativo' ? 'bg-green-100 text-green-700' :
                      property.status === 'Pendente' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {property.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p className="text-sm">Nenhuma propriedade recente encontrada</p>
                <p className="text-xs mt-1">Os dados aparecerão aqui quando houver atividade</p>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Atividade Recente</h3>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${activity.iconColor}`}>
                      <activity.icon size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-gray-500">{activity.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p className="text-sm">Nenhuma atividade recente encontrada</p>
                <p className="text-xs mt-1">As atividades aparecerão aqui quando houver movimentação</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
