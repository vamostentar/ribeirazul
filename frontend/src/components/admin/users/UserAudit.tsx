import { useUserAuditLogs } from '@/api/admin-queries';
import Modal from '@/components/Modal';
import { Activity, CheckCircle, Clock, User, XCircle } from 'lucide-react';
import React, { useState } from 'react';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface UserAuditProps {
  user: User;
  onClose: () => void;
}


const getActionIcon = (action: string) => {
  switch (action) {
    case 'LOGIN':
      return <CheckCircle size={16} className="text-green-600" />;
    case 'LOGIN_FAILED':
      return <XCircle size={16} className="text-red-600" />;
    case 'PROFILE_UPDATE':
      return <User size={16} className="text-blue-600" />;
    case 'PASSWORD_CHANGE':
      return <User size={16} className="text-purple-600" />;
    default:
      return <Activity size={16} className="text-gray-600" />;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'LOGIN':
      return 'bg-green-100 text-green-800';
    case 'LOGIN_FAILED':
      return 'bg-red-100 text-red-800';
    case 'PROFILE_UPDATE':
      return 'bg-blue-100 text-blue-800';
    case 'PASSWORD_CHANGE':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const UserAudit: React.FC<UserAuditProps> = ({ user, onClose }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const { data: auditLogs = [], isLoading } = useUserAuditLogs(user.id, selectedPeriod, 50);

  const getUserName = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email.split('@')[0];
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-PT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionDescription = (action: string) => {
    const descriptions: Record<string, string> = {
      'LOGIN': 'Login realizado',
      'LOGIN_FAILED': 'Tentativa de login falhada',
      'PROFILE_UPDATE': 'Perfil atualizado',
      'PASSWORD_CHANGE': 'Palavra-passe alterada',
      'ACCOUNT_LOCKED': 'Conta bloqueada',
      'ACCOUNT_UNLOCKED': 'Conta desbloqueada',
      'EMAIL_VERIFIED': 'Email verificado',
      'TWO_FACTOR_ENABLED': 'Autenticação de dois fatores ativada',
      'TWO_FACTOR_DISABLED': 'Autenticação de dois fatores desativada'
    };
    return descriptions[action] || action;
  };

  return (
    <Modal open={true} title={`Auditoria - ${getUserName()}`} onClose={onClose}>
      <div className="space-y-6">
        {/* User Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User size={20} className="text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{getUserName()}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Período:</label>
          <select
            className="px-3 py-1 border border-gray-200 rounded-lg text-sm"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="24h">Últimas 24 horas</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="all">Todo o histórico</option>
          </select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle size={16} className="text-green-600" />
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {auditLogs.filter(log => log.action === 'LOGIN').length}
                </div>
                <div className="text-xs text-gray-500">Logins</div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <XCircle size={16} className="text-red-600" />
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {auditLogs.filter(log => log.action === 'LOGIN_FAILED').length}
                </div>
                <div className="text-xs text-gray-500">Falhas</div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Activity size={16} className="text-blue-600" />
              <div>
                <div className="text-lg font-semibold text-gray-900">{auditLogs.length}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Logs */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Registo de Atividades</h3>
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                <Activity size={32} className="mx-auto mb-2 text-gray-400 animate-pulse" />
                <p>A carregar registos de auditoria...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity size={32} className="mx-auto mb-2 text-gray-400" />
                <p>Nenhuma atividade registada para este período</p>
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                            {getActionDescription(log.action)}
                          </span>
                          <span className="text-xs text-gray-500">
                            <Clock size={12} className="inline mr-1" />
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{log.description}</p>
                      {log.ipAddress && (
                        <div className="text-xs text-gray-500 mt-2">
                          <span className="font-medium">IP:</span> {log.ipAddress}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={() => {
              // Implementar exportação de logs
              console.log('Export audit logs');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Exportar Logs
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default UserAudit;
