import { useUpdatePropertyAdminStatus } from '@/api/queries';
import type { Property } from '@/types';
import { AlertCircle, Save, X } from 'lucide-react';
import { useState } from 'react';
import { AdminStatusBadge } from './Badges';

interface QuickStatusEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property | null;
}

export function QuickStatusEditModal({ isOpen, onClose, property }: QuickStatusEditModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<'ACTIVE' | 'PENDING' | 'INACTIVE'>('ACTIVE');
  const updateStatus = useUpdatePropertyAdminStatus();

  if (!isOpen || !property) return null;

  const handleSave = async () => {
    try {
      await updateStatus.mutateAsync({
        propertyId: property.id,
        adminStatus: selectedStatus
      });
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar estado:', error);
    }
  };

  const handleClose = () => {
    setSelectedStatus(property.adminStatus || 'ACTIVE');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Editar Estado</h3>
            <p className="text-sm text-gray-600 mt-1">{property.title}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Estado Atual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado Atual
            </label>
            <AdminStatusBadge status={property.adminStatus || 'ACTIVE'} />
          </div>

          {/* Novo Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Novo Estado
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'ACTIVE' | 'PENDING' | 'INACTIVE')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ACTIVE">Ativo</option>
              <option value="PENDING">Pendente</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </div>

          {/* Preview do Novo Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preview
            </label>
            <AdminStatusBadge status={selectedStatus} />
          </div>

          {/* Aviso */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle size={20} className="text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Atenção!</p>
                <p>Esta alteração afetará a visibilidade da propriedade no site público.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={updateStatus.isPending}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={updateStatus.isPending || selectedStatus === (property.adminStatus || 'ACTIVE')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {updateStatus.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar Alteração
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
