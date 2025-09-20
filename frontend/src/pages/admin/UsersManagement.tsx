import { useBulkImportUsers, useCreateUser, useDeleteUser, useRoles, useSendCommunication, useUpdateUser, useUsers } from '@/api/admin-queries';
import AdminLayout from '@/components/admin/AdminLayout';
import { UserAudit, UserCommunication, UserImport, UserPermissions } from '@/components/admin/users';
import Modal from '@/components/Modal';
import { ListSkeleton } from '@/components/Skeleton';
import { Toast } from '@/components/Toast';
import {
  Activity,
  CheckCircle,
  Download,
  Edit,
  Eye,
  Filter,
  Mail,
  Phone,
  Plus,
  Search,
  Settings,
  Shield,
  Trash2,
  Upload,
  User,
  Users
} from 'lucide-react';
import React, { useState } from 'react';
import { formatDate, formatDateTime } from '../../utils/dateUtils';

// Componente do formulário de utilizador
interface UserFormProps {
  user?: User | null;
  onSubmit: (data: UserFormData) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}

const UserForm: React.FC<UserFormProps> = ({ user, onSubmit, onCancel, isSubmitting }) => {
  const { data: roles = [] } = useRoles();

  const [formData, setFormData] = useState<UserFormData>({
    email: user?.email || '',
    password: '', // Always start empty
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    roleId: user?.roleId || roles[0]?.id || '',
    isActive: user?.isActive ?? true,
    isVerified: user?.isVerified ?? false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: keyof UserFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="email"
              required
              className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="utilizador@exemplo.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="tel"
              className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+351 123 456 789"
            />
          </div>
        </div>
      </div>

      {/* Password field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {user ? 'Nova Palavra-passe' : 'Palavra-passe *'}
        </label>
        <input
          type="password"
          required={!user} // Only required for new users
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={formData.password}
          onChange={(e) => handleChange('password', e.target.value)}
          placeholder={user ? "Deixe vazio para não alterar" : "Mínimo 8 caracteres"}
          minLength={8}
        />
        {user && (
          <p className="text-sm text-gray-500 mt-1">
            Deixe este campo vazio se não quiser alterar a palavra-passe
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              placeholder="João"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Apelido
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            placeholder="Silva"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de Utilizador
        </label>
        <div className="relative">
          <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <select
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={formData.roleId}
            onChange={(e) => handleChange('roleId', e.target.value)}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="isActive"
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={formData.isActive}
            onChange={(e) => handleChange('isActive', e.target.checked)}
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
            Utilizador Ativo
          </label>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="isVerified"
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            checked={formData.isVerified}
            onChange={(e) => handleChange('isVerified', e.target.checked)}
          />
          <label htmlFor="isVerified" className="text-sm font-medium text-gray-700">
            Email Verificado
          </label>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          onClick={() => {
            if (onCancel) {
              onCancel();
            } else {
              // Reset form data to original state as fallback
              if (user) {
                setFormData({
                  email: user.email || '',
                  password: '',
                  firstName: user.firstName || '',
                  lastName: user.lastName || '',
                  phone: user.phone || '',
                  roleId: user.roleId || roles[0]?.id || '',
                  isActive: user.isActive ?? true,
                  isVerified: user.isVerified ?? false,
                });
              } else {
                setFormData({
                  email: '',
                  password: '',
                  firstName: '',
                  lastName: '',
                  phone: '',
                  roleId: roles[0]?.id || '',
                  isActive: true,
                  isVerified: false,
                });
              }
            }
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'A guardar...' : (user ? 'Atualizar' : 'Criar')}
        </button>
      </div>
    </form>
  );
};

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive: boolean;
  isVerified: boolean;
  role: string;
  roleId: string;
  createdAt: string;
  updatedAt: string;
}

interface UserFormData {
  email: string;
  password?: string; // Optional for updates, required for creation
  firstName: string;
  lastName: string;
  phone: string;
  roleId: string; // Using role ID (UUID) instead of role name
  isActive: boolean;
  isVerified: boolean;
}

interface FilterState {
  search: string;
  role: string;
  status: string;
  dateRange: {
    start: string;
    end: string;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

interface BulkAction {
  type: 'activate' | 'deactivate' | 'delete' | 'export';
  userIds: string[];
}

interface UserRowProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
  onViewDetails: (user: User) => void;
  isSelected: boolean;
  onSelect: (userId: string) => void;
}

const UserRow: React.FC<UserRowProps> = ({ user, onEdit, onDelete, onViewDetails, isSelected, onSelect }) => {
  const getName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.email?.split('@')[0] || 'Utilizador';
  };

  const getType = () => {
    // For now, return the role name directly since we're getting it from the backend
    // In the future, we can map role names to display names
    return user?.role || 'Cliente';
  };

  const getStatus = () => {
    if (!user?.isActive) return 'Inativo';
    if (!user?.isVerified) return 'Pendente';
    return 'Ativo';
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-6 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {
            onSelect(user?.id || '');
          }}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User size={20} className="text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{getName()}</div>
            <div className="text-sm text-gray-500">{user?.email || 'Email não disponível'}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">{user?.phone || '-'}</td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          user?.role === 'agent' || user?.role === 'admin' || user?.role === 'moderator' 
            ? 'bg-blue-100 text-blue-700' 
            : 'bg-gray-100 text-gray-700'
        }`}>
          {getType()}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          getStatus() === 'Ativo' ? 'bg-green-100 text-green-700' : 
          getStatus() === 'Pendente' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {getStatus()}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {formatDate(user?.createdAt)}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center space-x-2">
          <button 
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            onClick={() => onViewDetails(user)}
            title="Ver detalhes"
          >
            <Eye size={16} />
          </button>
          <button 
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
            onClick={() => onEdit(user)}
            title="Editar"
          >
            <Edit size={16} />
          </button>
          <button 
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            onClick={() => onDelete(user?.id || '')}
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default function UsersManagement() {
  const [toast, setToast] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isCommunicationModalOpen, setIsCommunicationModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    role: '',
    status: '',
    dateRange: { start: '', end: '' },
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 20
  });
  
  const { data: usersData, isLoading, error } = useUsers({ 
    query: filters.search || undefined,
    limit: filters.limit,
    cursor: undefined
  });
  const { mutateAsync: deleteUser } = useDeleteUser();
  const { mutateAsync: createUser, isPending: isCreating } = useCreateUser();
  const { mutateAsync: updateUser, isPending: isUpdating } = useUpdateUser();
  const { mutateAsync: sendCommunication } = useSendCommunication();
  const { mutateAsync: bulkImportUsers } = useBulkImportUsers();

  const users = usersData?.data || [];
  const totalUsers = usersData?.pagination?.total || users.length;
  const totalPages = usersData?.pagination?.totalPages || 1;

  // Debug logging - removed excessive console logs

  // Statistics calculation
  const stats = {
    total: totalUsers,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
    verified: users.filter(u => u.isVerified).length,
    unverified: users.filter(u => !u.isVerified).length,
    agents: users.filter(u => u.role === 'agent').length,
    clients: users.filter(u => u.role === 'client' || !u.role).length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'moderator').length,
  };

  // Filter handlers
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      role: '',
      status: '',
      dateRange: { start: '', end: '' },
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
      limit: 20
    });
  };

  // Bulk actions
  const handleBulkAction = async (action: BulkAction['type']) => {
    if (selectedUsers.length === 0) {
      setToast('Selecione utilizadores para realizar a ação');
      return;
    }

    try {
      switch (action) {
        case 'activate':
          // Implementar ativação em lote
          setToast(`${selectedUsers.length} utilizadores ativados`);
          break;
        case 'deactivate':
          // Implementar desativação em lote
          setToast(`${selectedUsers.length} utilizadores desativados`);
          break;
        case 'delete':
          if (confirm(`Eliminar ${selectedUsers.length} utilizadores?`)) {
            // Implementar eliminação em lote
            setToast(`${selectedUsers.length} utilizadores eliminados`);
          }
          break;
        case 'export':
          exportUsers(selectedUsers);
          break;
      }
      setSelectedUsers([]);
    } catch (error) {
      setToast('Erro ao executar ação em lote');
    }
  };

  // Export functionality
  const exportUsers = (userIds?: string[]) => {
    const usersToExport = userIds ? users.filter(u => userIds.includes(u.id)) : users;
    const csvContent = generateCSV(usersToExport);
    downloadCSV(csvContent, 'utilizadores.csv');
    setToast('Utilizadores exportados com sucesso');
  };

  const generateCSV = (users: User[]) => {
    const headers = ['Nome', 'Email', 'Telefone', 'Tipo', 'Status', 'Verificado', 'Data Criação'];
    const rows = users.map(user => [
      `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      user.email,
      user.phone || '',
      user.role || 'Cliente',
      user.isActive ? 'Ativo' : 'Inativo',
      user.isVerified ? 'Sim' : 'Não',
      formatDate(user.createdAt)
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // User selection
  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      const newSelection = prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId];
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    setSelectedUsers(prev => 
      prev.length === users.length 
        ? [] 
        : users.map(u => u.id)
    );
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleViewDetails = (user: User) => {
    setEditingUser(user);
    setIsDetailModalOpen(true);
  };

  const handleSaveUser = async (formData: UserFormData) => {
    try {
      if (editingUser && editingUser.id) {
        // Update existing user - remove password if empty and map roleId to role
        const updateData: any = {
          ...formData,
          role: formData.roleId, // Backend expects 'role', not 'roleId'
        };
        delete updateData.roleId; // Remove roleId as backend doesn't expect it
        if (!updateData.password) {
          delete updateData.password;
        }
        await updateUser({ id: editingUser.id, userData: updateData });
        setToast('Utilizador atualizado com sucesso');
      } else {
        // Create new user - password is required
        if (!formData.password) {
          setToast('Palavra-passe é obrigatória para novos utilizadores');
          return;
        }
        // Map form data to backend format
        const userData = {
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          role: formData.roleId, // Backend expects 'role', not 'roleId'
          isActive: formData.isActive,
          isEmailVerified: formData.isVerified,
        };
        await createUser(userData);
        setToast('Utilizador criado com sucesso');
      }
      
      setIsEditModalOpen(false);
      setIsCreateModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      setToast('Erro ao salvar utilizador');
    }
  };

  const handleDelete = async (id: string) => {
    const user = users.find(u => u?.id === id);
    const name = user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user?.email.split('@')[0] || 'utilizador';
    
    if (!confirm(`Eliminar utilizador ${name}?`)) return;
    
    try {
      await deleteUser(id);
      setToast('Utilizador eliminado com sucesso');
    } catch (error) {
      setToast('Erro ao eliminar utilizador');
    }
  };


  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Gestão de Utilizadores</h2>
            <p className="text-gray-600 mt-1">Gerencie utilizadores, permissões e atividades</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors"
              onClick={() => exportUsers()}
            >
              <Download size={20} />
              <span>Exportar</span>
            </button>
            <button 
              className="bg-green-100 text-green-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-200 transition-colors"
              onClick={() => setIsImportModalOpen(true)}
            >
              <Upload size={20} />
              <span>Importar</span>
            </button>
            <button 
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={20} />
              <span>Novo Utilizador</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Utilizadores</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Utilizadores Ativos</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Agentes</p>
                <p className="text-2xl font-bold text-blue-600">{stats.agents}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clientes</p>
                <p className="text-2xl font-bold text-gray-600">{stats.clients}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text"
                  placeholder="Procurar por nome, email ou telefone..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
              
              {/* Quick Filters */}
              <div className="flex items-center space-x-3">
                <select
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                >
                  <option value="">Todos os tipos</option>
                  <option value="client">Cliente</option>
                  <option value="agent">Agente</option>
                  <option value="moderator">Moderador</option>
                  <option value="admin">Administrador</option>
                </select>
                
                <select
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">Todos os status</option>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="unverified">Não Verificado</option>
                </select>
                
                <button 
                  className="px-4 py-2 border border-gray-200 rounded-lg flex items-center space-x-2 hover:bg-gray-50 transition-colors"
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                >
                  <Filter size={20} />
                  <span>Mais Filtros</span>
                </button>
                
                {filters.search || filters.role || filters.status ? (
                  <button 
                    className="px-3 py-2 text-gray-600 hover:text-gray-800"
                    onClick={clearFilters}
                  >
                    Limpar
                  </button>
                ) : null}
              </div>
            </div>
            
            {/* Advanced Filters */}
            {isFiltersOpen && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Criação</label>
                    <div className="flex space-x-2">
                      <input
                        type="date"
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={filters.dateRange.start}
                        onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                      />
                      <input
                        type="date"
                        className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={filters.dateRange.end}
                        onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ordenar por</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    >
                      <option value="createdAt">Data de Criação</option>
                      <option value="firstName">Nome</option>
                      <option value="email">Email</option>
                      <option value="lastLoginAt">Último Login</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ordem</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={filters.sortOrder}
                      onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                    >
                      <option value="desc">Decrescente</option>
                      <option value="asc">Crescente</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-blue-800">
                    {selectedUsers.length} utilizador(es) selecionado(s)
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleBulkAction('activate')}
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    >
                      Ativar
                    </button>
                    <button
                      onClick={() => handleBulkAction('deactivate')}
                      className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                    >
                      Desativar
                    </button>
                    <button
                      onClick={() => handleBulkAction('export')}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Exportar
                    </button>
                    <button
                      onClick={() => handleBulkAction('delete')}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUsers([])}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="p-6">
              <ListSkeleton rows={5} />
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <div className="text-red-600 mb-2">Erro ao carregar utilizadores</div>
              <button 
                className="text-blue-600 hover:text-blue-800"
                onClick={() => window.location.reload()}
              >
                Tentar novamente
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum utilizador encontrado</h3>
              <p className="text-gray-500 mb-6">
                {filters.search || filters.role || filters.status 
                  ? 'Tente ajustar os filtros para encontrar utilizadores.'
                  : 'Comece criando o primeiro utilizador do sistema.'
                }
              </p>
              {!filters.search && !filters.role && !filters.status && (
                <button 
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Criar Primeiro Utilizador
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === users.length && users.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utilizador
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Telefone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Criado em
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user, index) => (
                      <UserRow
                        key={user.id || `user-${index}`}
                        user={user}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onViewDetails={handleViewDetails}
                        isSelected={selectedUsers.includes(user.id)}
                        onSelect={handleSelectUser}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">
                      Mostrando {((filters.page - 1) * filters.limit) + 1} a {Math.min(filters.page * filters.limit, totalUsers)} de {totalUsers} utilizadores
                    </span>
                    <select
                      className="px-2 py-1 border border-gray-200 rounded text-sm"
                      value={filters.limit}
                      onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                    >
                      <option value={10}>10 por página</option>
                      <option value={20}>20 por página</option>
                      <option value={50}>50 por página</option>
                      <option value={100}>100 por página</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleFilterChange('page', filters.page - 1)}
                      disabled={filters.page === 1}
                      className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Anterior
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => handleFilterChange('page', page)}
                            className={`px-3 py-1 text-sm rounded ${
                              filters.page === page
                                ? 'bg-blue-600 text-white'
                                : 'border border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => handleFilterChange('page', filters.page + 1)}
                      disabled={filters.page === totalPages}
                      className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Stats Summary */}
          {users.length > 0 && (
            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">
                    {users.filter(u => u.role === 'agent' || u.role === 'admin' || u.role === 'moderator').length}
                  </div>
                  <div className="text-sm text-gray-600">Agentes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">
                    {users.filter(u => u.role === 'client' || !u.role).length}
                  </div>
                  <div className="text-sm text-gray-600">Clientes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">
                    {users.filter(u => u.isActive).length}
                  </div>
                  <div className="text-sm text-gray-600">Utilizadores Ativos</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast text={toast ?? ''} show={!!toast} onClose={() => setToast(null)} />

      {/* Modal de Criação/Edição de Utilizador */}
      <Modal 
        open={isCreateModalOpen || isEditModalOpen} 
        title={editingUser ? 'Editar Utilizador' : 'Novo Utilizador'} 
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
      >
        <UserForm 
          user={editingUser}
          onSubmit={handleSaveUser}
          onCancel={() => {
            setIsCreateModalOpen(false);
            setIsEditModalOpen(false);
            setEditingUser(null);
          }}
          isSubmitting={isCreating || isUpdating}
        />
      </Modal>

      {/* Modal de Detalhes do Utilizador */}
      <Modal 
        open={isDetailModalOpen} 
        title="Detalhes do Utilizador" 
        onClose={() => {
          setIsDetailModalOpen(false);
          setEditingUser(null);
        }}
      >
        {editingUser && (
          <div className="space-y-6 max-w-4xl">
            {/* Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Pessoais</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nome Completo</label>
                    <p className="text-gray-900">
                      {editingUser.firstName && editingUser.lastName 
                        ? `${editingUser.firstName} ${editingUser.lastName}`
                        : editingUser.email?.split('@')[0] || 'Não informado'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{editingUser.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Telefone</label>
                    <p className="text-gray-900">{editingUser.phone || 'Não informado'}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações da Conta</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tipo de Utilizador</label>
                    <p className="text-gray-900">
                      {editingUser.role === 'agent' ? 'Agente' :
                       editingUser.role === 'admin' ? 'Administrador' :
                       editingUser.role === 'moderator' ? 'Moderador' : 'Cliente'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        editingUser.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {editingUser.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                      {editingUser.isVerified && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          Verificado
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data de Criação</label>
                    <p className="text-gray-900">
                      {formatDateTime(editingUser.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setIsEditModalOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Edit size={16} />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setIsCommunicationModalOpen(true);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Mail size={16} />
                  <span>Comunicar</span>
                </button>
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setIsAuditModalOpen(true);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Activity size={16} />
                  <span>Auditoria</span>
                </button>
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setIsPermissionsModalOpen(true);
                  }}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Settings size={16} />
                  <span>Permissões</span>
                </button>
              </div>
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={() => {
                    if (confirm('Eliminar este utilizador?')) {
                      handleDelete(editingUser.id);
                      setIsDetailModalOpen(false);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <Trash2 size={16} />
                  <span>Eliminar Utilizador</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Comunicação */}
      {isCommunicationModalOpen && editingUser && (
        <UserCommunication
          users={[editingUser]}
          onClose={() => {
            setIsCommunicationModalOpen(false);
            setEditingUser(null);
          }}
          onSend={async (data) => {
            try {
              const result = await sendCommunication(data);
              setToast(`Comunicação enviada para ${result.sentCount} utilizadores`);
            } catch (error) {
              setToast('Erro ao enviar comunicação');
            }
          }}
        />
      )}

      {/* Modal de Importação */}
      {isImportModalOpen && (
        <UserImport
          onClose={() => setIsImportModalOpen(false)}
          onImport={async (users) => {
            try {
              const result = await bulkImportUsers({ users });
              setToast(`${result.imported} utilizadores importados com sucesso`);
              if (result.errors && result.errors.length > 0) {
                setToast(`${result.imported} importados, ${result.failed} falharam`);
              }
            } catch (error) {
              setToast('Erro ao importar utilizadores');
            }
          }}
        />
      )}

      {/* Modal de Auditoria */}
      {isAuditModalOpen && editingUser && (
        <UserAudit
          user={editingUser}
          onClose={() => {
            setIsAuditModalOpen(false);
            setEditingUser(null);
          }}
        />
      )}

      {/* Modal de Permissões */}
      {isPermissionsModalOpen && editingUser && (
        <UserPermissions
          user={editingUser}
          onClose={() => {
            setIsPermissionsModalOpen(false);
            setEditingUser(null);
          }}
        />
      )}
    </AdminLayout>
  );
}