import { Toast } from '@/components/Toast';
import { AlertTriangle, Clock, RotateCcw, Save, Server, Settings, Shield } from 'lucide-react';
import React, { useState } from 'react';

interface SystemSettingsProps {
  settings: {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    businessConfig: {
      currency: string;
      timezone: string;
      language: string;
      dateFormat: string;
      timeFormat: string;
      maxFileSize: number;
      allowedFileTypes: string[];
    };
    securityConfig: {
      sessionTimeout: number;
      maxLoginAttempts: number;
      passwordMinLength: number;
      requireTwoFactor: boolean;
      enableAuditLog: boolean;
    };
    performanceConfig: {
      cacheEnabled: boolean;
      cacheTTL: number;
      compressionEnabled: boolean;
      imageOptimization: boolean;
    };
  };
  onUpdate: (field: string, value: any) => void;
  onSave: () => Promise<void>;
  onReset: () => Promise<void>;
  isSaving: boolean;
  isResetting: boolean;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({
  settings,
  onUpdate,
  onSave,
  onReset,
  isSaving,
  isResetting
}) => {
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'performance' | 'maintenance'>('general');

  const handleSave = async () => {
    try {
      await onSave();
      setToast('Configurações do sistema guardadas com sucesso!');
    } catch (error) {
      setToast('Erro ao guardar configurações do sistema');
    }
  };

  const handleReset = async () => {
    if (confirm('Tem certeza que deseja resetar as configurações do sistema?')) {
      try {
        await onReset();
        setToast('Configurações do sistema resetadas!');
      } catch (error) {
        setToast('Erro ao resetar configurações');
      }
    }
  };

  const tabs = [
    { id: 'general', label: 'Geral', icon: Settings },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'performance', label: 'Performance', icon: Server },
    { id: 'maintenance', label: 'Manutenção', icon: Clock },
  ];

  const currencies = [
    { code: 'EUR', name: 'Euro (€)', symbol: '€' },
    { code: 'USD', name: 'Dólar Americano ($)', symbol: '$' },
    { code: 'GBP', name: 'Libra Esterlina (£)', symbol: '£' },
    { code: 'BRL', name: 'Real Brasileiro (R$)', symbol: 'R$' },
  ];

  const timezones = [
    'Europe/Lisbon',
    'Europe/London',
    'Europe/Paris',
    'America/New_York',
    'America/Sao_Paulo',
    'Asia/Tokyo',
  ];

  const languages = [
    { code: 'pt-PT', name: 'Português (Portugal)' },
    { code: 'pt-BR', name: 'Português (Brasil)' },
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Español' },
    { code: 'fr-FR', name: 'Français' },
  ];

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Settings size={20} className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Configurações do Sistema</h3>
                <p className="text-sm text-gray-500">Configure parâmetros gerais e avançados do sistema</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <RotateCcw size={16} />
                <span>Resetar</span>
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <Save size={16} />
                <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
              </button>
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
                      ? 'border-purple-500 text-purple-600'
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
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Moeda Padrão
                  </label>
                  <select
                    value={settings.businessConfig.currency}
                    onChange={(e) => onUpdate('businessConfig', { ...settings.businessConfig, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {currencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fuso Horário
                  </label>
                  <select
                    value={settings.businessConfig.timezone}
                    onChange={(e) => onUpdate('businessConfig', { ...settings.businessConfig, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {timezones.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idioma Padrão
                  </label>
                  <select
                    value={settings.businessConfig.language}
                    onChange={(e) => onUpdate('businessConfig', { ...settings.businessConfig, language: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Formato de Data
                  </label>
                  <select
                    value={settings.businessConfig.dateFormat}
                    onChange={(e) => onUpdate('businessConfig', { ...settings.businessConfig, dateFormat: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Formato de Hora
                  </label>
                  <select
                    value={settings.businessConfig.timeFormat}
                    onChange={(e) => onUpdate('businessConfig', { ...settings.businessConfig, timeFormat: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="24h">24 horas</option>
                    <option value="12h">12 horas (AM/PM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tamanho Máximo de Ficheiro (MB)
                  </label>
                  <input
                    type="number"
                    value={settings.businessConfig.maxFileSize / (1024 * 1024)}
                    onChange={(e) => onUpdate('businessConfig', { 
                      ...settings.businessConfig, 
                      maxFileSize: parseInt(e.target.value) * 1024 * 1024 
                    })}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipos de Ficheiro Permitidos
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { type: 'image/jpeg', label: 'JPEG' },
                    { type: 'image/png', label: 'PNG' },
                    { type: 'image/webp', label: 'WebP' },
                    { type: 'image/gif', label: 'GIF' },
                    { type: 'application/pdf', label: 'PDF' },
                    { type: 'text/csv', label: 'CSV' },
                    { type: 'application/vnd.ms-excel', label: 'Excel' },
                    { type: 'application/zip', label: 'ZIP' },
                  ].map((fileType) => (
                    <label key={fileType.type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.businessConfig.allowedFileTypes.includes(fileType.type)}
                        onChange={(e) => {
                          const newTypes = e.target.checked
                            ? [...settings.businessConfig.allowedFileTypes, fileType.type]
                            : settings.businessConfig.allowedFileTypes.filter(t => t !== fileType.type);
                          onUpdate('businessConfig', { ...settings.businessConfig, allowedFileTypes: newTypes });
                        }}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">{fileType.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Shield size={20} className="text-red-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Configurações de Segurança</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Configure parâmetros de segurança para proteger o sistema
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeout de Sessão (minutos)
                  </label>
                  <input
                    type="number"
                    value={settings.securityConfig.sessionTimeout}
                    onChange={(e) => onUpdate('securityConfig', { ...settings.securityConfig, sessionTimeout: parseInt(e.target.value) })}
                    min="5"
                    max="480"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Máximo de Tentativas de Login
                  </label>
                  <input
                    type="number"
                    value={settings.securityConfig.maxLoginAttempts}
                    onChange={(e) => onUpdate('securityConfig', { ...settings.securityConfig, maxLoginAttempts: parseInt(e.target.value) })}
                    min="3"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tamanho Mínimo da Palavra-passe
                  </label>
                  <input
                    type="number"
                    value={settings.securityConfig.passwordMinLength}
                    onChange={(e) => onUpdate('securityConfig', { ...settings.securityConfig, passwordMinLength: parseInt(e.target.value) })}
                    min="6"
                    max="20"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cache TTL (minutos)
                  </label>
                  <input
                    type="number"
                    value={settings.performanceConfig.cacheTTL}
                    onChange={(e) => onUpdate('performanceConfig', { ...settings.performanceConfig, cacheTTL: parseInt(e.target.value) })}
                    min="1"
                    max="1440"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Exigir Autenticação de Dois Fatores</span>
                    <p className="text-xs text-gray-500">Requer 2FA para todos os utilizadores</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.securityConfig.requireTwoFactor}
                      onChange={(e) => onUpdate('securityConfig', { ...settings.securityConfig, requireTwoFactor: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Ativar Log de Auditoria</span>
                    <p className="text-xs text-gray-500">Regista todas as ações dos utilizadores</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.securityConfig.enableAuditLog}
                      onChange={(e) => onUpdate('securityConfig', { ...settings.securityConfig, enableAuditLog: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Server size={20} className="text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">Configurações de Performance</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Otimize a performance do sistema
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Ativar Cache</span>
                    <p className="text-xs text-gray-500">Melhora a velocidade de carregamento</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.performanceConfig.cacheEnabled}
                      onChange={(e) => onUpdate('performanceConfig', { ...settings.performanceConfig, cacheEnabled: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Compressão Ativada</span>
                    <p className="text-xs text-gray-500">Reduz o tamanho dos ficheiros transferidos</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.performanceConfig.compressionEnabled}
                      onChange={(e) => onUpdate('performanceConfig', { ...settings.performanceConfig, compressionEnabled: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Otimização de Imagens</span>
                    <p className="text-xs text-gray-500">Comprime automaticamente as imagens</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.performanceConfig.imageOptimization}
                      onChange={(e) => onUpdate('performanceConfig', { ...settings.performanceConfig, imageOptimization: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Modo de Manutenção</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Ative o modo de manutenção para realizar atualizações
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Ativar Modo de Manutenção</span>
                    <p className="text-xs text-gray-500">Bloqueia o acesso público ao site</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.maintenanceMode}
                      onChange={(e) => onUpdate('maintenanceMode', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>

                {settings.maintenanceMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mensagem de Manutenção
                    </label>
                    <textarea
                      value={settings.maintenanceMessage}
                      onChange={(e) => onUpdate('maintenanceMessage', e.target.value)}
                      rows={4}
                      placeholder="Digite uma mensagem explicando a manutenção..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast text={toast ?? ''} show={!!toast} onClose={() => setToast(null)} />
    </>
  );
};

export default SystemSettings;
