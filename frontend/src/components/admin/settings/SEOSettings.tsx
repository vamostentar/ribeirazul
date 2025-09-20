import { Toast } from '@/components/Toast';
import { AlertCircle, CheckCircle, Eye, Globe, RotateCcw, Save, Search } from 'lucide-react';
import React, { useState } from 'react';

interface SEOSettingsProps {
  settings: {
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    twitterCard: string;
    canonicalUrl: string;
    robotsTxt: string;
  };
  onUpdate: (field: string, value: string) => void;
  onSave: () => Promise<void>;
  onReset: () => Promise<void>;
  isSaving: boolean;
  isResetting: boolean;
}

export const SEOSettings: React.FC<SEOSettingsProps> = ({
  settings,
  onUpdate,
  onSave,
  onReset,
  isSaving,
  isResetting
}) => {
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'meta' | 'social' | 'technical'>('meta');

  const handleSave = async () => {
    try {
      await onSave();
      setToast('Configurações SEO guardadas com sucesso!');
    } catch (error) {
      setToast('Erro ao guardar configurações SEO');
    }
  };

  const handleReset = async () => {
    if (confirm('Tem certeza que deseja resetar as configurações SEO?')) {
      try {
        await onReset();
        setToast('Configurações SEO resetadas!');
      } catch (error) {
        setToast('Erro ao resetar configurações');
      }
    }
  };

  const getTitleScore = () => {
    const length = settings.seoTitle.length;
    if (length === 0) return { score: 0, status: 'error', message: 'Título obrigatório' };
    if (length < 30) return { score: 60, status: 'warning', message: 'Muito curto' };
    if (length > 60) return { score: 40, status: 'warning', message: 'Muito longo' };
    return { score: 100, status: 'success', message: 'Tamanho ideal' };
  };

  const getDescriptionScore = () => {
    const length = settings.seoDescription.length;
    if (length === 0) return { score: 0, status: 'error', message: 'Descrição obrigatória' };
    if (length < 120) return { score: 60, status: 'warning', message: 'Muito curta' };
    if (length > 160) return { score: 40, status: 'warning', message: 'Muito longa' };
    return { score: 100, status: 'success', message: 'Tamanho ideal' };
  };

  const titleScore = getTitleScore();
  const descriptionScore = getDescriptionScore();

  const tabs = [
    { id: 'meta', label: 'Meta Tags', icon: Search },
    { id: 'social', label: 'Redes Sociais', icon: Globe },
    { id: 'technical', label: 'Técnico', icon: Eye },
  ];

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Search size={20} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">SEO & Otimização</h3>
                <p className="text-sm text-gray-500">Configure metadados e otimização para motores de busca</p>
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
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
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
                      ? 'border-green-500 text-green-600'
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
          {/* Meta Tags Tab */}
          {activeTab === 'meta' && (
            <div className="space-y-6">
              {/* SEO Score */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Pontuação SEO</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Título</span>
                        <span className="text-xs font-medium">{titleScore.score}/100</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            titleScore.status === 'success' ? 'bg-green-500' :
                            titleScore.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${titleScore.score}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        {titleScore.status === 'success' ? (
                          <CheckCircle size={12} className="text-green-500" />
                        ) : (
                          <AlertCircle size={12} className={titleScore.status === 'warning' ? 'text-yellow-500' : 'text-red-500'} />
                        )}
                        <span className={`text-xs ${
                          titleScore.status === 'success' ? 'text-green-600' :
                          titleScore.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {titleScore.message}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Descrição</span>
                        <span className="text-xs font-medium">{descriptionScore.score}/100</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            descriptionScore.status === 'success' ? 'bg-green-500' :
                            descriptionScore.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${descriptionScore.score}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        {descriptionScore.status === 'success' ? (
                          <CheckCircle size={12} className="text-green-500" />
                        ) : (
                          <AlertCircle size={12} className={descriptionScore.status === 'warning' ? 'text-yellow-500' : 'text-red-500'} />
                        )}
                        <span className={`text-xs ${
                          descriptionScore.status === 'success' ? 'text-green-600' :
                          descriptionScore.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {descriptionScore.message}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Meta Tags Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título SEO *
                  </label>
                  <input
                    type="text"
                    value={settings.seoTitle}
                    onChange={(e) => onUpdate('seoTitle', e.target.value)}
                    maxLength={60}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Título otimizado para SEO (máx. 60 caracteres)"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {settings.seoTitle.length}/60 caracteres
                    </span>
                    <span className={`text-xs ${
                      titleScore.status === 'success' ? 'text-green-600' :
                      titleScore.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {titleScore.message}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição SEO *
                  </label>
                  <textarea
                    value={settings.seoDescription}
                    onChange={(e) => onUpdate('seoDescription', e.target.value)}
                    maxLength={160}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Descrição otimizada para SEO (120-160 caracteres)"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {settings.seoDescription.length}/160 caracteres
                    </span>
                    <span className={`text-xs ${
                      descriptionScore.status === 'success' ? 'text-green-600' :
                      descriptionScore.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {descriptionScore.message}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Palavras-chave SEO
                  </label>
                  <input
                    type="text"
                    value={settings.seoKeywords}
                    onChange={(e) => onUpdate('seoKeywords', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="palavra-chave1, palavra-chave2, palavra-chave3"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separe as palavras-chave por vírgulas
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Social Media Tab */}
          {activeTab === 'social' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Globe size={20} className="text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">Open Graph & Twitter Cards</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Configure como o seu conteúdo aparece quando partilhado nas redes sociais
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título para Redes Sociais
                  </label>
                  <input
                    type="text"
                    value={settings.ogTitle}
                    onChange={(e) => onUpdate('ogTitle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Título otimizado para Facebook, LinkedIn, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição para Redes Sociais
                  </label>
                  <textarea
                    value={settings.ogDescription}
                    onChange={(e) => onUpdate('ogDescription', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Descrição que aparece quando o link é partilhado"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagem para Redes Sociais
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="url"
                      value={settings.ogImage}
                      onChange={(e) => onUpdate('ogImage', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="https://exemplo.com/imagem-social.jpg"
                    />
                    <button className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      Upload
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Recomendado: 1200x630px (formato 1.91:1)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Twitter Card
                  </label>
                  <select
                    value={settings.twitterCard}
                    onChange={(e) => onUpdate('twitterCard', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="summary">Summary</option>
                    <option value="summary_large_image">Summary Large Image</option>
                    <option value="app">App</option>
                    <option value="player">Player</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Technical Tab */}
          {activeTab === 'technical' && (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Eye size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">Configurações Técnicas</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Configurações avançadas para motores de busca
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL Canónica
                  </label>
                  <input
                    type="url"
                    value={settings.canonicalUrl}
                    onChange={(e) => onUpdate('canonicalUrl', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="https://exemplo.com/pagina-principal"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    URL preferida para esta página (evita conteúdo duplicado)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Robots.txt
                  </label>
                  <textarea
                    value={settings.robotsTxt}
                    onChange={(e) => onUpdate('robotsTxt', e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                    placeholder="User-agent: *
Allow: /
Disallow: /admin/
Disallow: /private/"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Instruções para motores de busca sobre como indexar o site
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast text={toast ?? ''} show={!!toast} onClose={() => setToast(null)} />
    </>
  );
};

export default SEOSettings;
