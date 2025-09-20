import React, { useState } from 'react';
import { 
  Home, 
  Users, 
  Building, 
  BarChart3, 
  Settings, 
  Bell,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Filter,
  Calendar,
  MapPin,
  Euro,
  TrendingUp,
  UserCheck,
  Building2,
  Phone,
  Mail,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');

  // Dados simulados
  const stats = {
    totalProperties: 1247,
    activeUsers: 892,
    monthlyViews: 45678,
    pendingApprovals: 23
  };

  const recentProperties = [
    { id: 1, title: 'Apartamento T3 em Lisboa', type: 'Venda', price: '285000', status: 'Ativo', views: 156 },
    { id: 2, title: 'Moradia V4 no Porto', type: 'Venda', price: '450000', status: 'Pendente', views: 89 },
    { id: 3, title: 'Estúdio em Coimbra', type: 'Arrendamento', price: '650/mês', status: 'Ativo', views: 234 },
    { id: 4, title: 'Loja no Centro Comercial', type: 'Arrendamento', price: '1200/mês', status: 'Inativo', views: 45 }
  ];

  const users = [
    { id: 1, name: 'João Silva', email: 'joao@email.com', type: 'Agente', properties: 12, status: 'Ativo' },
    { id: 2, name: 'Maria Santos', email: 'maria@email.com', type: 'Cliente', properties: 0, status: 'Ativo' },
    { id: 3, name: 'Pedro Costa', email: 'pedro@email.com', type: 'Agente', properties: 8, status: 'Pendente' },
    { id: 4, name: 'Ana Ferreira', email: 'ana@email.com', type: 'Cliente', properties: 0, status: 'Ativo' }
  ];

  const MenuItem = ({ icon: Icon, label, tabKey, count }) => (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
        activeTab === tabKey ? 'bg-blue-100 text-blue-700 shadow-sm' : 'hover:bg-gray-100'
      }`}
      onClick={() => setActiveTab(tabKey)}
    >
      <div className="flex items-center space-x-3">
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </div>
      {count && (
        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{count}</span>
      )}
    </div>
  );

  const StatCard = ({ icon: Icon, title, value, change, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp size={16} className="mr-1" />
              {change > 0 ? '+' : ''}{change}% este mês
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );

  const PropertyRow = ({ property }) => (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="p-4">
        <div className="font-medium text-gray-800">{property.title}</div>
        <div className="text-sm text-gray-500">{property.type}</div>
      </td>
      <td className="p-4 font-semibold text-green-600">€{property.price}</td>
      <td className="p-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          property.status === 'Ativo' ? 'bg-green-100 text-green-700' :
          property.status === 'Pendente' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {property.status}
        </span>
      </td>
      <td className="p-4 text-gray-600">{property.views} visualizações</td>
      <td className="p-4">
        <div className="flex space-x-2">
          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
            <Eye size={16} />
          </button>
          <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
            <Edit size={16} />
          </button>
          <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );

  const UserRow = ({ user }) => (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="p-4">
        <div className="font-medium text-gray-800">{user.name}</div>
        <div className="text-sm text-gray-500">{user.email}</div>
      </td>
      <td className="p-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          user.type === 'Agente' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
        }`}>
          {user.type}
        </span>
      </td>
      <td className="p-4 text-gray-600">{user.properties} propriedades</td>
      <td className="p-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          user.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {user.status}
        </span>
      </td>
      <td className="p-4">
        <div className="flex space-x-2">
          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
            <Eye size={16} />
          </button>
          <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
            <Edit size={16} />
          </button>
          <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard':
        return (
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
                <div className="space-y-3">
                  {recentProperties.slice(0, 3).map(property => (
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
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Atividade Recente</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle size={16} className="text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Propriedade aprovada</p>
                      <p className="text-xs text-gray-500">Apartamento T3 em Lisboa • há 2 horas</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <UserCheck size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Novo agente registrado</p>
                      <p className="text-xs text-gray-500">João Silva • há 4 horas</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-100 rounded-full">
                      <AlertCircle size={16} className="text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Propriedade pendente</p>
                      <p className="text-xs text-gray-500">Moradia V4 no Porto • há 6 horas</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'properties':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Gestão de Propriedades</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors">
                <Plus size={20} />
                <span>Nova Propriedade</span>
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      type="text"
                      placeholder="Procurar propriedades..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button className="px-4 py-2 border border-gray-200 rounded-lg flex items-center space-x-2 hover:bg-gray-50">
                    <Filter size={20} />
                    <span>Filtros</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left p-4 font-semibold text-gray-700">Propriedade</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Preço</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Estado</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Visualizações</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentProperties.map(property => (
                      <PropertyRow key={property.id} property={property} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Gestão de Utilizadores</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors">
                <Plus size={20} />
                <span>Novo Utilizador</span>
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      type="text"
                      placeholder="Procurar utilizadores..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button className="px-4 py-2 border border-gray-200 rounded-lg flex items-center space-x-2 hover:bg-gray-50">
                    <Filter size={20} />
                    <span>Filtros</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left p-4 font-semibold text-gray-700">Utilizador</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Tipo</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Propriedades</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Estado</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <UserRow key={user.id} user={user} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Análises e Relatórios</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Propriedades por Tipo</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Apartamentos</span>
                    <span className="font-semibold">45%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{width: '45%'}}></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Moradias</span>
                    <span className="font-semibold">30%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{width: '30%'}}></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Terrenos</span>
                    <span className="font-semibold">15%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{width: '15%'}}></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Comercial</span>
                    <span className="font-semibold">10%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-600 h-2 rounded-full" style={{width: '10%'}}></div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Regiões Mais Procuradas</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <MapPin size={16} className="text-gray-500" />
                      <span>Lisboa</span>
                    </div>
                    <span className="font-semibold">2,456 pesquisas</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <MapPin size={16} className="text-gray-500" />
                      <span>Porto</span>
                    </div>
                    <span className="font-semibold">1,832 pesquisas</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <MapPin size={16} className="text-gray-500" />
                      <span>Coimbra</span>
                    </div>
                    <span className="font-semibold">945 pesquisas</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <MapPin size={16} className="text-gray-500" />
                      <span>Braga</span>
                    </div>
                    <span className="font-semibold">678 pesquisas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Configurações do Sistema</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Configurações Gerais</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Portal</label>
                    <input 
                      type="text" 
                      value="Portal Imobiliário" 
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email de Contacto</label>
                    <input 
                      type="email" 
                      value="admin@portal.com" 
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                    <input 
                      type="tel" 
                      value="+351 123 456 789" 
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Permissões</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Aprovação automática de propriedades</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Permitir registo de novos agentes</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Notificações por email</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Selecione uma opção do menu</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Building2 className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-gray-800">Portal Imobiliário</h1>
              <p className="text-sm text-gray-500">Painel Admin</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          <MenuItem icon={BarChart3} label="Dashboard" tabKey="dashboard" />
          <MenuItem icon={Building} label="Propriedades" tabKey="properties" />
          <MenuItem icon={Users} label="Utilizadores" tabKey="users" />
          <MenuItem icon={BarChart3} label="Análises" tabKey="analytics" />
          <MenuItem icon={Settings} label="Configurações" tabKey="settings" />
          <MenuItem icon={Bell} label="Aprovações" tabKey="approvals" count={stats.pendingApprovals} />
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {activeTab === 'dashboard' && 'Dashboard'}
                {activeTab === 'properties' && 'Propriedades'}
                {activeTab === 'users' && 'Utilizadores'}
                {activeTab === 'analytics' && 'Análises'}
                {activeTab === 'settings' && 'Configurações'}
                {activeTab === 'approvals' && 'Aprovações'}
              </h1>
              <p className="text-gray-600">Gerencie o seu portal imobiliário</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg relative">
                <Bell size={20} />
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {stats.pendingApprovals}
                </span>
              </button>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="font-medium text-gray-800">Administrador</p>
                  <p className="text-sm text-gray-500">admin@portal.com</p>
                </div>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">A</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;