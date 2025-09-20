import Modal from '@/components/Modal';
import { Toast } from '@/components/Toast';
import { Mail, MessageSquare, Send, Users } from 'lucide-react';
import React, { useState } from 'react';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface UserCommunicationProps {
  users: User[];
  onClose: () => void;
  onSend: (data: CommunicationData) => Promise<void>;
}

interface CommunicationData {
  type: 'email' | 'notification' | 'bulk_email';
  subject: string;
  message: string;
  userIds: string[];
  template?: string;
}

const EMAIL_TEMPLATES = [
  { id: 'welcome', name: 'Boas-vindas', subject: 'Bem-vindo ao Portal Imobiliário', content: 'Olá {name}, bem-vindo ao nosso portal!' },
  { id: 'password_reset', name: 'Reset de Password', subject: 'Reset da sua palavra-passe', content: 'Clique no link para redefinir a sua palavra-passe.' },
  { id: 'account_activation', name: 'Ativação de Conta', subject: 'Ative a sua conta', content: 'Clique no link para ativar a sua conta.' },
  { id: 'custom', name: 'Personalizado', subject: '', content: '' }
];

export const UserCommunication: React.FC<UserCommunicationProps> = ({ users, onClose, onSend }) => {
  const [formData, setFormData] = useState<CommunicationData>({
    type: 'email',
    subject: '',
    message: '',
    userIds: users.map(u => u.id),
    template: 'custom'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) {
      setToast('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSend(formData);
      setToast('Mensagem enviada com sucesso');
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      setToast('Erro ao enviar mensagem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        template: templateId,
        subject: template.subject,
        message: template.content
      }));
    }
  };

  const getSelectedUsersText = () => {
    if (formData.userIds.length === users.length) {
      return `Todos os utilizadores (${users.length})`;
    }
    return `${formData.userIds.length} utilizador(es) selecionado(s)`;
  };

  return (
    <>
      <Modal open={true} title="Comunicação com Utilizadores" onClose={onClose}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Comunicação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de Comunicação</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'email' }))}
                className={`p-3 border rounded-lg flex items-center space-x-2 ${
                  formData.type === 'email' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <Mail size={20} className={formData.type === 'email' ? 'text-blue-600' : 'text-gray-400'} />
                <span className="text-sm">Email</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'notification' }))}
                className={`p-3 border rounded-lg flex items-center space-x-2 ${
                  formData.type === 'notification' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <MessageSquare size={20} className={formData.type === 'notification' ? 'text-blue-600' : 'text-gray-400'} />
                <span className="text-sm">Notificação</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'bulk_email' }))}
                className={`p-3 border rounded-lg flex items-center space-x-2 ${
                  formData.type === 'bulk_email' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <Users size={20} className={formData.type === 'bulk_email' ? 'text-blue-600' : 'text-gray-400'} />
                <span className="text-sm">Email em Massa</span>
              </button>
            </div>
          </div>

          {/* Destinatários */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Destinatários</label>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Users size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600">{getSelectedUsersText()}</span>
              </div>
            </div>
          </div>

          {/* Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
            <select
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.template}
              onChange={(e) => handleTemplateChange(e.target.value)}
            >
              {EMAIL_TEMPLATES.map(template => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </div>

          {/* Assunto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assunto *
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Digite o assunto da mensagem"
            />
          </div>

          {/* Mensagem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mensagem *
            </label>
            <textarea
              required
              rows={6}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Digite a sua mensagem..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Use {'{name}'} para personalizar com o nome do utilizador
            </p>
          </div>

          {/* Preview */}
          {formData.subject && formData.message && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pré-visualização</label>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="text-sm font-medium text-gray-900 mb-2">{formData.subject}</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {formData.message.replace('{name}', 'João Silva')}
                </div>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Send size={16} />
              <span>{isSubmitting ? 'Enviando...' : 'Enviar'}</span>
            </button>
          </div>
        </form>
      </Modal>

      <Toast text={toast ?? ''} show={!!toast} onClose={() => setToast(null)} />
    </>
  );
};

export default UserCommunication;
