import { useBackups, useCreateBackup, useDeleteBackup, useDownloadBackup, useRestoreBackup } from '@/api/admin-queries';
import { Toast } from '@/components/Toast';
import { AlertCircle, Clock, Database, Download, RefreshCw, Upload } from 'lucide-react';
import React, { useState } from 'react';

interface BackupSettingsProps {
  onBackup: () => Promise<void>;
  onRestore: (file: File) => Promise<void>;
  onDeleteBackup: (backupId: string) => Promise<void>;
  isBackingUp: boolean;
  isRestoring: boolean;
}

export const BackupSettings: React.FC<BackupSettingsProps> = () => {
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'backup' | 'restore' | 'history'>('backup');

  // API hooks
  const { data: backups = [], isLoading: isLoadingBackups, refetch: refetchBackups } = useBackups();
  const { mutateAsync: createBackup, isPending: isCreatingBackup } = useCreateBackup();
  const { mutateAsync: restoreBackup, isPending: isRestoringBackup } = useRestoreBackup();
  const { mutateAsync: deleteBackup, isPending: isDeletingBackup } = useDeleteBackup();
  const { mutateAsync: downloadBackup, isPending: isDownloadingBackup } = useDownloadBackup();

  const handleBackup = async (type: 'full' | 'incremental' | 'settings') => {
    try {
      await createBackup({
        type,
        description: `Backup ${type} criado em ${new Date().toLocaleDateString('pt-PT')}`
      });
      setToast(`Backup ${type} criado com sucesso!`);
      refetchBackups();
    } catch (error) {
      setToast('Erro ao criar backup');
    }
  };

  const handleRestore = async (backupId: string) => {
    if (!confirm('Tem certeza que deseja restaurar este backup? Esta ação irá substituir todas as configurações atuais.')) {
      return;
    }

    try {
      await restoreBackup({
        backupId,
        confirmRestore: true
      });
      setToast('Backup restaurado com sucesso!');
      refetchBackups();
    } catch (error) {
      setToast('Erro ao restaurar backup');
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (confirm('Tem certeza que deseja eliminar este backup?')) {
      try {
        await deleteBackup(backupId);
        setToast('Backup eliminado com sucesso!');
        refetchBackups();
      } catch (error) {
        setToast('Erro ao eliminar backup');
      }
    }
  };

  const handleDownloadBackup = async (backupId: string, filename: string) => {
    try {
      const blob = await downloadBackup(backupId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setToast('Download iniciado!');
    } catch (error) {
      setToast('Erro ao fazer download do backup');
    }
  };

  const getBackupTypeIcon = (type: string) => {
    switch (type) {
      case 'full':
        return <Database size={16} className="text-blue-600" />;
      case 'incremental':
        return <RefreshCw size={16} className="text-green-600" />;
      case 'settings':
        return <Database size={16} className="text-purple-600" />;
      default:
        return <Database size={16} className="text-gray-600" />;
    }
  };

  const getBackupTypeLabel = (type: string) => {
    switch (type) {
      case 'full':
        return 'Backup Completo';
      case 'incremental':
        return 'Backup Incremental';
      case 'settings':
        return 'Apenas Configurações';
      default:
        return 'Desconhecido';
    }
  };

  const tabs = [
    { id: 'backup', label: 'Criar Backup', icon: Download },
    { id: 'restore', label: 'Restaurar', icon: Upload },
    { id: 'history', label: 'Histórico', icon: Clock },
  ];

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Database size={20} className="text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Backup & Restauração</h3>
                <p className="text-sm text-gray-500">Gerencie backups e restaurações do sistema</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Backup Tab */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Download size={20} className="text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">Criar Novo Backup</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Crie um backup completo do sistema incluindo dados e configurações
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => handleBackup('full')}
                  disabled={isCreatingBackup}
                  className="p-6 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <Database size={24} className="text-blue-600" />
                    <div>
                      <h5 className="font-medium text-gray-900">Backup Completo</h5>
                      <p className="text-sm text-gray-500">Todos os dados</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    Inclui utilizadores, propriedades, configurações e ficheiros
                  </p>
                </button>

                <button
                  onClick={() => handleBackup('incremental')}
                  disabled={isCreatingBackup}
                  className="p-6 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <RefreshCw size={24} className="text-green-600" />
                    <div>
                      <h5 className="font-medium text-gray-900">Backup Incremental</h5>
                      <p className="text-sm text-gray-500">Apenas mudanças</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    Apenas dados modificados desde o último backup
                  </p>
                </button>

                <button
                  onClick={() => handleBackup('settings')}
                  disabled={isCreatingBackup}
                  className="p-6 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <Database size={24} className="text-purple-600" />
                    <div>
                      <h5 className="font-medium text-gray-900">Apenas Configurações</h5>
                      <p className="text-sm text-gray-500">Settings only</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    Apenas configurações do sistema
                  </p>
                </button>
              </div>

              {isCreatingBackup && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-blue-700">A criar backup...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Restore Tab */}
          {activeTab === 'restore' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle size={20} className="text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Atenção</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      A restauração irá substituir todos os dados atuais. Certifique-se de fazer um backup antes de proceder.
                    </p>
                  </div>
                </div>
              </div>

              {isLoadingBackups ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Carregando backups...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {backups.map((backup) => (
                    <div key={backup.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getBackupTypeIcon(backup.type)}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{backup.name}</div>
                            <div className="text-xs text-gray-500">
                              {getBackupTypeLabel(backup.type)} • {backup.size} • {backup.createdAt}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleRestore(backup.id)}
                            disabled={isRestoringBackup}
                            className="px-3 py-1 text-orange-600 border border-orange-200 rounded hover:bg-orange-50 transition-colors text-sm disabled:opacity-50"
                          >
                            {isRestoringBackup ? 'Restaurando...' : 'Restaurar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-gray-900">Histórico de Backups</h4>
                <button 
                  onClick={() => refetchBackups()}
                  className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                  <RefreshCw size={16} />
                  <span>Atualizar</span>
                </button>
              </div>

              {isLoadingBackups ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Carregando backups...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {backups.map((backup) => (
                    <div key={backup.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getBackupTypeIcon(backup.type)}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{backup.name}</div>
                            <div className="text-xs text-gray-500">
                              {getBackupTypeLabel(backup.type)} • {backup.size} • {backup.createdAt}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDownloadBackup(backup.id, backup.name)}
                            disabled={isDownloadingBackup}
                            className="px-3 py-1 text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors text-sm disabled:opacity-50"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => handleDeleteBackup(backup.id)}
                            disabled={isDeletingBackup}
                            className="px-3 py-1 text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors text-sm disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isLoadingBackups && backups.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Database size={32} className="mx-auto mb-2 text-gray-400" />
                  <p>Nenhum backup encontrado</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Toast text={toast ?? ''} show={!!toast} onClose={() => setToast(null)} />
    </>
  );
};

export default BackupSettings;