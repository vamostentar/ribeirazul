import { useDashboardStats } from '@/api/admin-queries';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart3,
  Bell,
  Building,
  Building2,
  LogOut,
  Settings,
  Users
} from 'lucide-react';
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface MenuItemProps {
  icon: React.ComponentType<any>;
  label: string;
  path: string;
  count?: number;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon: Icon, label, path, count }) => {
  const location = useLocation();
  const isActive = location.pathname === path;
  
  return (
    <Link 
      to={path}
      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
        isActive ? 'bg-blue-100 text-blue-700 shadow-sm' : 'hover:bg-gray-100'
      }`}
    >
      <div className="flex items-center space-x-3">
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </div>
      {count && (
        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{count}</span>
      )}
    </Link>
  );
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data: dashboardData } = useDashboardStats();
  const pendingApprovals = dashboardData?.pendingApprovals || 0;


  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Mesmo com erro, redirecionar para login
      navigate('/login');
    }
  };

  const getPageTitle = () => {
    switch(location.pathname) {
      case '/admin':
      case '/admin/dashboard':
        return 'Dashboard';
      case '/admin/properties':
        return 'Propriedades';
      case '/admin/users':
        return 'Utilizadores';
      case '/admin/analytics':
        return 'Análises';
      case '/admin/settings':
        return 'Configurações';
      case '/admin/approvals':
        return 'Aprovações';
      default:
        return 'Administração';
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
          <MenuItem icon={BarChart3} label="Dashboard" path="/admin/dashboard" />
          <MenuItem icon={Building} label="Propriedades" path="/admin/properties" />
          <MenuItem icon={Users} label="Utilizadores" path="/admin/users" />
          <MenuItem icon={BarChart3} label="Análises" path="/admin/analytics" />
          <MenuItem icon={Settings} label="Configurações" path="/admin/settings" />
          <MenuItem icon={Bell} label="Aprovações" path="/admin/approvals" count={pendingApprovals} />
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {getPageTitle()}
              </h1>
              <p className="text-gray-600">Gerencie o seu portal imobiliário</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg relative">
                <Bell size={20} />
                {pendingApprovals > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {pendingApprovals}
                  </span>
                )}
              </button>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="font-medium text-gray-800">
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user?.firstName 
                      ? user.firstName
                      : user?.email 
                      ? user.email.split('@')[0] 
                      : 'Usuário'
                    }
                  </p>
                  <p className="text-sm text-gray-500">{user?.email || 'usuario@email.com'}</p>
                </div>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {user?.firstName 
                      ? user.firstName.charAt(0).toUpperCase()
                      : user?.email 
                      ? user.email.charAt(0).toUpperCase() 
                      : 'U'
                    }
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                  title="Fazer logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
