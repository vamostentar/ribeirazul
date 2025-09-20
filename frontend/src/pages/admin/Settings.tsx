import { useResetSystemSettings, useSystemSettings, useUpdateSystemSettings } from '@/api/admin-queries';
import AdminLayout from '@/components/admin/AdminLayout';
import { BackupSettings, BrandSettings, SEOSettings, SystemSettings } from '@/components/admin/settings';
import { ListSkeleton } from '@/components/Skeleton';
import { Toast } from '@/components/Toast';
import type { UpdateSystemSettingsRequest } from '@/types';
import { Database, Palette, RotateCcw, Save, Search, Server } from 'lucide-react';
import React, { useState } from 'react';

interface SettingsFormData extends UpdateSystemSettingsRequest {
  // Extended settings for new components
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
  canonicalUrl?: string;
  robotsTxt?: string;
  securityConfig?: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordMinLength: number;
    requireTwoFactor: boolean;
    enableAuditLog: boolean;
  };
  performanceConfig?: {
    cacheEnabled: boolean;
    cacheTTL: number;
    compressionEnabled: boolean;
    imageOptimization: boolean;
  };
}

export default function Settings() {
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'brand' | 'seo' | 'system' | 'backup'>('brand');
  
  const { data: systemSettingsResponse, isLoading } = useSystemSettings();
  const { mutateAsync: updateSettings, isPending: isUpdating } = useUpdateSystemSettings();
  const { mutateAsync: resetSettings, isPending: isResetting } = useResetSystemSettings();

  const systemSettings = systemSettingsResponse?.success ? systemSettingsResponse.data : null;

  const [formData, setFormData] = useState<SettingsFormData>({
    brandName: 'Portal Imobiliário',
    contactEmail: 'admin@portal.com',
    contactPhone: '+351 123 456 789',
    primaryColor: '#2563eb',
    secondaryColor: '#1f2937',
    accentColor: '#f59e0b',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    maintenanceMode: false,
    maintenanceMessage: '',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    twitterCard: 'summary',
    canonicalUrl: '',
    robotsTxt: '',
    businessConfig: {
      currency: 'EUR',
      timezone: 'Europe/Lisbon',
      language: 'pt-PT',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      maxFileSize: 10485760,
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
    securityConfig: {
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      passwordMinLength: 8,
      requireTwoFactor: false,
      enableAuditLog: true,
    },
    performanceConfig: {
      cacheEnabled: true,
      cacheTTL: 60,
      compressionEnabled: true,
      imageOptimization: true,
    },
  });

  // Update form data when system settings are loaded
  React.useEffect(() => {
    if (systemSettings) {
      setFormData(prev => ({
        ...prev,
        brandName: systemSettings.brandName || 'Portal Imobiliário',
        logoUrl: systemSettings.logoUrl || '',
        faviconUrl: systemSettings.faviconUrl || '',
        primaryColor: systemSettings.primaryColor || '#2563eb',
        secondaryColor: systemSettings.secondaryColor || '#1f2937',
        accentColor: systemSettings.accentColor || '#f59e0b',
        backgroundColor: systemSettings.backgroundColor || '#ffffff',
        textColor: systemSettings.textColor || '#111827',
        contactEmail: systemSettings.contactEmail || 'admin@portal.com',
        contactPhone: systemSettings.contactPhone || '+351 123 456 789',
        contactAddress: systemSettings.contactAddress || '',
        socialLinks: systemSettings.socialLinks || {},
        businessHours: systemSettings.businessHours || {},
        businessConfig: systemSettings.businessConfig || prev.businessConfig,
        seoTitle: systemSettings.seoTitle || '',
        seoDescription: systemSettings.seoDescription || '',
        seoKeywords: systemSettings.seoKeywords || '',
        maintenanceMode: systemSettings.maintenanceMode || false,
        maintenanceMessage: systemSettings.maintenanceMessage || '',
      }));
    }
  }, [systemSettings]);

  const handleUpdate = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      await updateSettings(formData);
      setToast('Configurações guardadas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      setToast('Erro ao guardar configurações');
    }
  };

  const handleReset = async () => {
    if (confirm('Tem certeza que deseja resetar todas as configurações para os valores padrão?')) {
      try {
        await resetSettings();
        setToast('Configurações resetadas com sucesso!');
      } catch (error) {
        console.error('Error resetting settings:', error);
        setToast('Erro ao resetar configurações');
      }
    }
  };

  const handleBackup = async () => {
    // TODO: Implement backup functionality
    console.log('Creating backup...');
  };

  const handleRestore = async (file: File) => {
    // TODO: Implement restore functionality
    console.log('Restoring from file:', file.name);
  };

  const handleDeleteBackup = async (backupId: string) => {
    // TODO: Implement delete backup functionality
    console.log('Deleting backup:', backupId);
  };

  const tabs = [
    { id: 'brand', label: 'Marca & Visual', icon: Palette },
    { id: 'seo', label: 'SEO & Otimização', icon: Search },
    { id: 'system', label: 'Sistema', icon: Server },
    { id: 'backup', label: 'Backup & Restauração', icon: Database },
  ];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Configurações do Sistema</h2>
          <ListSkeleton rows={4} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Server size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Configurações do Sistema</h2>
              <p className="text-sm text-gray-500">Gerencie todas as configurações da plataforma</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <RotateCcw size={16} />
              <span>{isResetting ? 'Resetando...' : 'Resetar Tudo'}</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Save size={16} />
              <span>{isUpdating ? 'Guardando...' : 'Guardar Tudo'}</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
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
                        ? 'border-blue-500 text-blue-600'
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
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'brand' && (
            <BrandSettings
              settings={{
                brandName: formData.brandName || '',
                logoUrl: formData.logoUrl || '',
                faviconUrl: formData.faviconUrl || '',
                primaryColor: formData.primaryColor || '#2563eb',
                secondaryColor: formData.secondaryColor || '#1f2937',
                accentColor: formData.accentColor || '#f59e0b',
                backgroundColor: formData.backgroundColor || '#ffffff',
                textColor: formData.textColor || '#111827',
              }}
              onUpdate={handleUpdate}
              onSave={handleSave}
              onReset={handleReset}
              isSaving={isUpdating}
              isResetting={isResetting}
            />
          )}

          {activeTab === 'seo' && (
            <SEOSettings
              settings={{
                seoTitle: formData.seoTitle || '',
                seoDescription: formData.seoDescription || '',
                seoKeywords: formData.seoKeywords || '',
                ogTitle: formData.ogTitle || '',
                ogDescription: formData.ogDescription || '',
                ogImage: formData.ogImage || '',
                twitterCard: formData.twitterCard || 'summary',
                canonicalUrl: formData.canonicalUrl || '',
                robotsTxt: formData.robotsTxt || '',
              }}
              onUpdate={handleUpdate}
              onSave={handleSave}
              onReset={handleReset}
              isSaving={isUpdating}
              isResetting={isResetting}
            />
          )}

          {activeTab === 'system' && (
            <SystemSettings
              settings={{
                maintenanceMode: formData.maintenanceMode || false,
                maintenanceMessage: formData.maintenanceMessage || '',
                businessConfig: formData.businessConfig || {
                  currency: 'EUR',
                  timezone: 'Europe/Lisbon',
                  language: 'pt-PT',
                  dateFormat: 'DD/MM/YYYY',
                  timeFormat: '24h',
                  maxFileSize: 10485760,
                  allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
                },
                securityConfig: formData.securityConfig || {
                  sessionTimeout: 30,
                  maxLoginAttempts: 5,
                  passwordMinLength: 8,
                  requireTwoFactor: false,
                  enableAuditLog: true,
                },
                performanceConfig: formData.performanceConfig || {
                  cacheEnabled: true,
                  cacheTTL: 60,
                  compressionEnabled: true,
                  imageOptimization: true,
                },
              }}
              onUpdate={handleUpdate}
              onSave={handleSave}
              onReset={handleReset}
              isSaving={isUpdating}
              isResetting={isResetting}
            />
          )}

          {activeTab === 'backup' && (
            <BackupSettings
              onBackup={handleBackup}
              onRestore={handleRestore}
              onDeleteBackup={handleDeleteBackup}
              isBackingUp={false}
              isRestoring={false}
            />
          )}
        </div>

        {/* System Information */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações do Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-600">Status do Serviço</div>
              <div className="text-lg font-semibold text-green-600">
                {systemSettingsResponse?.success ? 'Online' : 'Offline'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Última Atualização</div>
              <div className="text-lg font-semibold text-gray-800">
                {systemSettings ? new Date(systemSettings.updatedAt).toLocaleDateString('pt-PT') : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Versão da API</div>
              <div className="text-lg font-semibold text-gray-800">
                {systemSettingsResponse?.meta?.version || '1.0.0'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Timezone</div>
              <div className="text-lg font-semibold text-gray-800">
                {formData.businessConfig?.timezone || 'Europe/Lisbon'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toast text={toast ?? ''} show={!!toast} onClose={() => setToast(null)} />
    </AdminLayout>
  );
}
