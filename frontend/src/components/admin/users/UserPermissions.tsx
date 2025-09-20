import { useUpdateUserPermissions } from '@/api/admin-queries';
import Modal from '@/components/Modal';
import { Toast } from '@/components/Toast';
import { Check, Shield, Users, X } from 'lucide-react';
import React, { useState } from 'react';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isActive: boolean;
}

interface UserPermissionsProps {
  user: User;
  onClose: () => void;
}

const PERMISSIONS: Permission[] = [
  // User Management
  { id: 'users.read', name: 'users.read', description: 'Visualizar utilizadores', category: 'Gestão de Utilizadores' },
  { id: 'users.create', name: 'users.create', description: 'Criar utilizadores', category: 'Gestão de Utilizadores' },
  { id: 'users.update', name: 'users.update', description: 'Editar utilizadores', category: 'Gestão de Utilizadores' },
  { id: 'users.delete', name: 'users.delete', description: 'Eliminar utilizadores', category: 'Gestão de Utilizadores' },
  
  // Properties Management
  { id: 'properties.read', name: 'properties.read', description: 'Visualizar propriedades', category: 'Gestão de Propriedades' },
  { id: 'properties.create', name: 'properties.create', description: 'Criar propriedades', category: 'Gestão de Propriedades' },
  { id: 'properties.update', name: 'properties.update', description: 'Editar propriedades', category: 'Gestão de Propriedades' },
  { id: 'properties.delete', name: 'properties.delete', description: 'Eliminar propriedades', category: 'Gestão de Propriedades' },
  
  // Analytics
  { id: 'analytics.read', name: 'analytics.read', description: 'Visualizar análises', category: 'Análises' },
  { id: 'analytics.export', name: 'analytics.export', description: 'Exportar dados', category: 'Análises' },
  
  // System
  { id: 'system.settings', name: 'system.settings', description: 'Configurações do sistema', category: 'Sistema' },
  { id: 'system.audit', name: 'system.audit', description: 'Logs de auditoria', category: 'Sistema' }
];

const ROLES: Role[] = [
  {
    id: 'client',
    name: 'client',
    displayName: 'Cliente',
    description: 'Acesso básico ao portal',
    permissions: ['properties.read'],
    isActive: true
  },
  {
    id: 'agent',
    name: 'agent',
    displayName: 'Agente',
    description: 'Gestão de propriedades',
    permissions: ['properties.read', 'properties.create', 'properties.update', 'analytics.read'],
    isActive: true
  },
  {
    id: 'admin',
    name: 'admin',
    displayName: 'Administrador',
    description: 'Gestão completa do sistema',
    permissions: ['users.read', 'users.create', 'users.update', 'properties.read', 'properties.create', 'properties.update', 'analytics.read', 'analytics.export'],
    isActive: true
  },
  {
    id: 'super_admin',
    name: 'super_admin',
    displayName: 'Super Administrador',
    description: 'Acesso total ao sistema',
    permissions: PERMISSIONS.map(p => p.id),
    isActive: true
  }
];

export const UserPermissions: React.FC<UserPermissionsProps> = ({ user, onClose }) => {
  const [selectedRole, setSelectedRole] = useState<string>(user.role);
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  
  const { mutateAsync: updatePermissions } = useUpdateUserPermissions();

  const getUserName = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email.split('@')[0];
  };

  const getCurrentRole = () => {
    return ROLES.find(role => role.name === selectedRole) || ROLES[0];
  };

  const getCurrentPermissions = () => {
    const role = getCurrentRole();
    return [...role.permissions, ...customPermissions];
  };

  const handleRoleChange = (roleId: string) => {
    setSelectedRole(roleId);
    setCustomPermissions([]);
  };

  const handlePermissionToggle = (permissionId: string) => {
    const role = getCurrentRole();
    const isRolePermission = role.permissions.includes(permissionId);
    
    if (isRolePermission) {
      // Cannot remove role-based permissions
      return;
    }

    setCustomPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updatePermissions({ userId: user.id, permissions: getCurrentPermissions() });
      setToast('Permissões atualizadas com sucesso');
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      setToast('Erro ao atualizar permissões');
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedPermissions = PERMISSIONS.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <>
      <Modal open={true} title={`Permissões - ${getUserName()}`} onClose={onClose}>
        <div className="space-y-6">
          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users size={20} className="text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{getUserName()}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de Utilizador</label>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(role => (
                <button
                  key={role.id}
                  onClick={() => handleRoleChange(role.id)}
                  className={`p-4 border rounded-lg text-left transition-colors ${
                    selectedRole === role.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield size={16} className={selectedRole === role.id ? 'text-blue-600' : 'text-gray-400'} />
                    <span className="font-medium text-sm">{role.displayName}</span>
                  </div>
                  <p className="text-xs text-gray-600">{role.description}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    {role.permissions.length} permissões base
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Current Role Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield size={20} className="text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  {getCurrentRole().displayName}
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  {getCurrentRole().description}
                </p>
                <div className="text-xs text-blue-600 mt-2">
                  Permissões base: {getCurrentRole().permissions.length} | 
                  Permissões customizadas: {customPermissions.length} | 
                  Total: {getCurrentPermissions().length}
                </div>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissões Detalhadas</h3>
            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([category, permissions]) => (
                <div key={category} className="border border-gray-200 rounded-lg">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h4 className="font-medium text-gray-900">{category}</h4>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 gap-3">
                      {permissions.map(permission => {
                        const isRolePermission = getCurrentRole().permissions.includes(permission.id);
                        const isCustomPermission = customPermissions.includes(permission.id);
                        const isEnabled = isRolePermission || isCustomPermission;
                        
                        return (
                          <div key={permission.id} className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {permission.description}
                                </span>
                                {isRolePermission && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    Base
                                  </span>
                                )}
                                {isCustomPermission && (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                    Custom
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {permission.name}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {isRolePermission ? (
                                <div className="flex items-center space-x-1 text-blue-600">
                                  <Check size={16} />
                                  <span className="text-xs">Obrigatória</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handlePermissionToggle(permission.id)}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                    isEnabled
                                      ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  }`}
                                >
                                  {isEnabled ? <Check size={16} /> : <X size={16} />}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'A guardar...' : 'Guardar Permissões'}
            </button>
          </div>
        </div>
      </Modal>

      <Toast text={toast ?? ''} show={!!toast} onClose={() => setToast(null)} />
    </>
  );
};

export default UserPermissions;
