import { useAnalyticsData } from '@/api/admin-queries';
import AdminLayout from '@/components/admin/AdminLayout';
import { ListSkeleton } from '@/components/Skeleton';
import { MapPin } from 'lucide-react';

export default function Analytics() {
  const { data: analyticsData, isLoading, error } = useAnalyticsData();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Análises e Relatórios</h2>
          <ListSkeleton rows={6} />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Análises e Relatórios</h2>
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 text-sm font-semibold mb-1">Erro ao carregar dados de análise</p>
            <p className="text-red-700 text-sm">Verifique a conexão com os serviços.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const { propertyTypes, topRegions, monthlyStats } = analyticsData || {
    propertyTypes: [] as Array<{ name: string; percentage: number; color: string }>,
    topRegions: [] as Array<{ name: string; searches: number }>,
    monthlyStats: [] as Array<{ month: string; properties: number; users: number; views: number }>
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Análises e Relatórios</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Property Types Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Propriedades por Tipo</h3>
            <div className="space-y-4">
              {propertyTypes.map((type, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">{type.name}</span>
                    <span className="font-semibold text-gray-800">{type.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${type.color} h-2 rounded-full transition-all duration-300`}
                      style={{width: `${type.percentage}%`}}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Regions */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Regiões Mais Procuradas</h3>
            <div className="space-y-4">
              {topRegions.map((region, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-600 font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin size={16} className="text-gray-500" />
                      <span className="font-medium text-gray-800">{region.name}</span>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-600">{region.searches.toLocaleString()} pesquisas</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Trends */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Tendências Mensais</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-700">Mês</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Propriedades Adicionadas</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Novos Utilizadores</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Visualizações</th>
                </tr>
              </thead>
              <tbody>
                {monthlyStats.map((stat, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">{stat.month}</td>
                    <td className="p-4 text-gray-600">{stat.properties}</td>
                    <td className="p-4 text-gray-600">{stat.users}</td>
                    <td className="p-4 text-gray-600">{stat.views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-600 mb-2">Taxa de Conversão</h4>
            <div className="text-2xl font-bold text-gray-800 mb-1">3.2%</div>
            <div className="text-sm text-green-600">+0.5% vs mês anterior</div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-600 mb-2">Tempo Médio no Site</h4>
            <div className="text-2xl font-bold text-gray-800 mb-1">4:32</div>
            <div className="text-sm text-green-600">+12s vs mês anterior</div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-600 mb-2">Taxa de Rejeição</h4>
            <div className="text-2xl font-bold text-gray-800 mb-1">42.1%</div>
            <div className="text-sm text-red-600">+2.3% vs mês anterior</div>
          </div>
        </div>

        {/* Recent Activity Summary */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumo de Atividade (Últimos 30 dias)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">156</div>
              <div className="text-sm text-gray-600">Propriedades Visualizadas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">23</div>
              <div className="text-sm text-gray-600">Contactos Recebidos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">8</div>
              <div className="text-sm text-gray-600">Propriedades Vendidas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">12</div>
              <div className="text-sm text-gray-600">Novos Agentes</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
