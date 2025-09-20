import { Toast } from '@/components/Toast';
import { Palette, RotateCcw, Save, Upload } from 'lucide-react';
import React, { useState } from 'react';

interface BrandSettingsProps {
  settings: {
    brandName: string;
    logoUrl: string;
    faviconUrl: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
  };
  onUpdate: (field: string, value: string) => void;
  onSave: () => Promise<void>;
  onReset: () => Promise<void>;
  isSaving: boolean;
  isResetting: boolean;
}

export const BrandSettings: React.FC<BrandSettingsProps> = ({
  settings,
  onUpdate,
  onSave,
  onReset,
  isSaving,
  isResetting
}) => {
  const [toast, setToast] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const handleSave = async () => {
    try {
      await onSave();
      setToast('Configurações de marca guardadas com sucesso!');
    } catch (error) {
      setToast('Erro ao guardar configurações');
    }
  };

  const handleReset = async () => {
    if (confirm('Tem certeza que deseja resetar as configurações de marca?')) {
      try {
        await onReset();
        setToast('Configurações de marca resetadas!');
      } catch (error) {
        setToast('Erro ao resetar configurações');
      }
    }
  };

  const colorPresets = [
    { name: 'Azul Profissional', primary: '#2563eb', secondary: '#1f2937', accent: '#3b82f6' },
    { name: 'Verde Corporativo', primary: '#059669', secondary: '#064e3b', accent: '#10b981' },
    { name: 'Roxo Moderno', primary: '#7c3aed', secondary: '#4c1d95', accent: '#8b5cf6' },
    { name: 'Laranja Energia', primary: '#ea580c', secondary: '#9a3412', accent: '#f97316' },
  ];

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Palette size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Marca & Identidade Visual</h3>
                <p className="text-sm text-gray-500">Configure a identidade visual da sua plataforma</p>
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <Save size={16} />
                <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Brand Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Informações da Marca</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Marca *
                </label>
                <input
                  type="text"
                  value={settings.brandName}
                  onChange={(e) => onUpdate('brandName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Portal Imobiliário"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL do Logo
                </label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={settings.logoUrl}
                    onChange={(e) => onUpdate('logoUrl', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://exemplo.com/logo.png"
                  />
                  <button className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1">
                    <Upload size={16} />
                    <span>Upload</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Color Scheme */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Esquema de Cores</h4>
            
            {/* Color Presets */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Temas Pré-definidos</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {colorPresets.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      onUpdate('primaryColor', preset.primary);
                      onUpdate('secondaryColor', preset.secondary);
                      onUpdate('accentColor', preset.accent);
                    }}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors text-left"
                  >
                    <div className="flex space-x-1 mb-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.primary }}></div>
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.secondary }}></div>
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.accent }}></div>
                    </div>
                    <div className="text-xs font-medium text-gray-700">{preset.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cor Primária</label>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => onUpdate('primaryColor', e.target.value)}
                    className="w-12 h-10 border border-gray-200 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => onUpdate('primaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cor Secundária</label>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(e) => onUpdate('secondaryColor', e.target.value)}
                    className="w-12 h-10 border border-gray-200 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.secondaryColor}
                    onChange={(e) => onUpdate('secondaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cor de Destaque</label>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => onUpdate('accentColor', e.target.value)}
                    className="w-12 h-10 border border-gray-200 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.accentColor}
                    onChange={(e) => onUpdate('accentColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cor de Fundo</label>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) => onUpdate('backgroundColor', e.target.value)}
                    className="w-12 h-10 border border-gray-200 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.backgroundColor}
                    onChange={(e) => onUpdate('backgroundColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">Pré-visualização</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    previewMode === 'desktop' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Desktop
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    previewMode === 'mobile' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Mobile
                </button>
              </div>
            </div>
            
            <div className={`border border-gray-200 rounded-lg overflow-hidden ${
              previewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
            }`}>
              {/* Preview Header */}
              <div 
                className="p-4 flex items-center justify-between"
                style={{ backgroundColor: settings.backgroundColor }}
              >
                <div className="flex items-center space-x-3">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="w-8 h-8" />
                  ) : (
                    <div 
                      className="w-8 h-8 rounded flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: settings.primaryColor }}
                    >
                      {settings.brandName.charAt(0)}
                    </div>
                  )}
                  <span 
                    className="font-semibold"
                    style={{ color: settings.textColor }}
                  >
                    {settings.brandName}
                  </span>
                </div>
                <button 
                  className="px-3 py-1 rounded text-sm font-medium"
                  style={{ 
                    backgroundColor: settings.primaryColor, 
                    color: 'white' 
                  }}
                >
                  Login
                </button>
              </div>
              
              {/* Preview Content */}
              <div className="p-4 space-y-3" style={{ backgroundColor: settings.backgroundColor }}>
                <div 
                  className="h-32 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: settings.secondaryColor }}
                >
                  <span className="text-white font-medium">Hero Section</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    className="h-16 rounded flex items-center justify-center"
                    style={{ backgroundColor: settings.accentColor }}
                  >
                    <span className="text-white text-sm">Feature 1</span>
                  </div>
                  <div 
                    className="h-16 rounded flex items-center justify-center"
                    style={{ backgroundColor: settings.accentColor }}
                  >
                    <span className="text-white text-sm">Feature 2</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toast text={toast ?? ''} show={!!toast} onClose={() => setToast(null)} />
    </>
  );
};

export default BrandSettings;
