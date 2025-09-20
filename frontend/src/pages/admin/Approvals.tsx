import AdminLayout from '@/components/admin/AdminLayout';
import { Toast } from '@/components/Toast';
import {
    AlertCircle,
    CheckCircle,
    Clock,
    Eye,
    XCircle
} from 'lucide-react';
import React, { useState } from 'react';

interface PendingItem {
  id: string;
  type: 'property' | 'user' | 'report';
  title: string;
  description: string;
  submittedBy: string;
  submittedAt: string;
  priority: 'low' | 'medium' | 'high';
}

interface ApprovalRowProps {
  item: PendingItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onView: (id: string) => void;
}

const ApprovalRow: React.FC<ApprovalRowProps> = ({ item, onApprove, onReject, onView }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'property': return 'bg-blue-100 text-blue-700';
      case 'user': return 'bg-green-100 text-green-700';
      case 'report': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'property': return 'Propriedade';
      case 'user': return 'Utilizador';
      case 'report': return 'Relatório';
      default: return 'Outro';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return 'Normal';
    }
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="p-4">
        <div className="flex items-center space-x-3">
          <Clock size={16} className="text-gray-400" />
          <div>
            <div className="font-medium text-gray-800">{item.title}</div>
            <div className="text-sm text-gray-500">{item.description}</div>
          </div>
        </div>
      </td>
      <td className="p-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
          {getTypeLabel(item.type)}
        </span>
      </td>
      <td className="p-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
          {getPriorityLabel(item.priority)}
        </span>
      </td>
      <td className="p-4 text-sm text-gray-600">
        <div>{item.submittedBy}</div>
        <div className="text-xs text-gray-500">{item.submittedAt}</div>
      </td>
      <td className="p-4">
        <div className="flex space-x-2">
          <button 
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            onClick={() => onView(item.id)}
            title="Visualizar"
          >
            <Eye size={16} />
          </button>
          <button 
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
            onClick={() => onApprove(item.id)}
            title="Aprovar"
          >
            <CheckCircle size={16} />
          </button>
          <button 
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            onClick={() => onReject(item.id)}
            title="Rejeitar"
          >
            <XCircle size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default function Approvals() {
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'property' | 'user' | 'report'>('all');

  // Dados simulados - TODO: Substituir por dados reais da API
  const pendingItems: PendingItem[] = [
    {
      id: '1',
      type: 'property',
      title: 'Apartamento T3 em Lisboa',
      description: 'Propriedade no centro da cidade, 3 quartos, 2 casas de banho',
      submittedBy: 'João Silva',
      submittedAt: 'há 2 horas',
      priority: 'high'
    },
    {
      id: '2',
      type: 'user',
      title: 'Novo Agente: Maria Santos',
      description: 'Pedido de registo como agente imobiliário',
      submittedBy: 'Maria Santos',
      submittedAt: 'há 4 horas',
      priority: 'medium'
    },
    {
      id: '3',
      type: 'property',
      title: 'Moradia V4 no Porto',
      description: 'Casa com jardim, 4 quartos, garagem para 2 carros',
      submittedBy: 'Pedro Costa',
      submittedAt: 'há 6 horas',
      priority: 'medium'
    },
    {
      id: '4',
      type: 'report',
      title: 'Relatório de Problema',
      description: 'Utilizador reportou problema com propriedade ID #123',
      submittedBy: 'Ana Ferreira',
      submittedAt: 'há 1 dia',
      priority: 'low'
    },
    {
      id: '5',
      type: 'property',
      title: 'Loja Comercial no Centro',
      description: 'Espaço comercial de 100m², ideal para restauração',
      submittedBy: 'Carlos Oliveira',
      submittedAt: 'há 1 dia',
      priority: 'low'
    }
  ];

  const filteredItems = filter === 'all' 
    ? pendingItems 
    : pendingItems.filter(item => item.type === filter);

  const handleApprove = (id: string) => {
    const item = pendingItems.find(i => i.id === id);
    setToast(`${item?.title} aprovado com sucesso!`);
    // TODO: Implementar aprovação real
  };

  const handleReject = (id: string) => {
    const item = pendingItems.find(i => i.id === id);
    if (!confirm(`Rejeitar: ${item?.title}?`)) return;
    setToast(`${item?.title} rejeitado.`);
    // TODO: Implementar rejeição real
  };

  const handleView = (id: string) => {
    const item = pendingItems.find(i => i.id === id);
    setToast(`Visualizar: ${item?.title}`);
    // TODO: Implementar modal de visualização
  };

  const getFilterCount = (type: 'all' | 'property' | 'user' | 'report') => {
    if (type === 'all') return pendingItems.length;
    return pendingItems.filter(item => item.type === type).length;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Aprovações Pendentes</h2>
          <div className="flex items-center space-x-2">
            <AlertCircle className="text-orange-500" size={20} />
            <span className="text-orange-600 font-medium">
              {pendingItems.length} itens aguardando aprovação
            </span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { key: 'all' as const, label: 'Todos' },
              { key: 'property' as const, label: 'Propriedades' },
              { key: 'user' as const, label: 'Utilizadores' },
              { key: 'report' as const, label: 'Relatórios' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filter === key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {label} ({getFilterCount(key)})
              </button>
            ))}
          </div>
        </div>

        {/* Approvals Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
                <div className="text-lg font-medium mb-2">Nenhuma aprovação pendente</div>
                <div className="text-sm">Todos os itens foram processados!</div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left p-4 font-semibold text-gray-700">Item</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Tipo</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Prioridade</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Submetido</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <ApprovalRow
                      key={item.id}
                      item={item}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onView={handleView}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Ações Rápidas</h3>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Aprovar Todas as Propriedades
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Aprovar Todos os Utilizadores
            </button>
            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              Marcar Relatórios como Lidos
            </button>
          </div>
        </div>
      </div>

      <Toast text={toast ?? ''} show={!!toast} onClose={() => setToast(null)} />
    </AdminLayout>
  );
}
