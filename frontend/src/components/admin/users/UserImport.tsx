import Modal from '@/components/Modal';
import { Toast } from '@/components/Toast';
import { AlertCircle, CheckCircle, Download, FileText, Upload, X } from 'lucide-react';
import React, { useRef, useState } from 'react';

interface UserImportProps {
  onClose: () => void;
  onImport: (users: ImportUserData[]) => Promise<void>;
}

interface ImportUserData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
}

interface ImportResult {
  success: boolean;
  data?: ImportUserData[];
  errors?: string[];
}

const CSV_TEMPLATE = `email,firstName,lastName,phone,role,isActive,isVerified
joao.silva@exemplo.com,João,Silva,+351 123 456 789,client,true,false
maria.santos@exemplo.com,Maria,Santos,+351 987 654 321,agent,true,true`;

export const UserImport: React.FC<UserImportProps> = ({ onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setToast('Por favor, selecione um ficheiro CSV válido');
        return;
      }
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const parseCSV = (csvText: string): ImportResult => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return { success: false, errors: ['Ficheiro CSV deve ter pelo menos um cabeçalho e uma linha de dados'] };
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['email', 'firstname', 'lastname', 'role'];
    
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return { 
        success: false, 
        errors: [`Cabeçalhos obrigatórios em falta: ${missingHeaders.join(', ')}`] 
      };
    }

    const users: ImportUserData[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) {
        errors.push(`Linha ${i + 1}: Número de colunas incorreto`);
        continue;
      }

      const user: any = {};
      headers.forEach((header, index) => {
        user[header] = values[index];
      });

      // Validações
      if (!user.email || !user.email.includes('@')) {
        errors.push(`Linha ${i + 1}: Email inválido`);
        continue;
      }

      if (!user.firstname || !user.lastname) {
        errors.push(`Linha ${i + 1}: Nome e apelido são obrigatórios`);
        continue;
      }

      const validRoles = ['client', 'agent', 'admin', 'super_admin'];
      if (!validRoles.includes(user.role?.toLowerCase())) {
        errors.push(`Linha ${i + 1}: Role inválido. Use: ${validRoles.join(', ')}`);
        continue;
      }

      users.push({
        email: user.email,
        firstName: user.firstname,
        lastName: user.lastname,
        phone: user.phone || '',
        role: user.role.toLowerCase(),
        isActive: user.isactive?.toLowerCase() === 'true' || true,
        isVerified: user.isverified?.toLowerCase() === 'true' || false
      });
    }

    return { success: true, data: users, errors: errors.length > 0 ? errors : undefined };
  };

  const handleProcessFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const text = await file.text();
      const result = parseCSV(text);
      setImportResult(result);
    } catch (error) {
      setToast('Erro ao processar o ficheiro');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!importResult?.data) return;

    try {
      await onImport(importResult.data);
      setToast(`${importResult.data.length} utilizadores importados com sucesso`);
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      setToast('Erro ao importar utilizadores');
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_utilizadores.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Modal open={true} title="Importar Utilizadores" onClose={onClose}>
        <div className="space-y-6">
          {/* Instruções */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle size={20} className="text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">Instruções de Importação</h3>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>• Use um ficheiro CSV com os cabeçalhos corretos</li>
                  <li>• Campos obrigatórios: email, firstName, lastName, role</li>
                  <li>• Roles válidos: client, agent, admin, super_admin</li>
                  <li>• Campos opcionais: phone, isActive, isVerified</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Download Template */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText size={20} className="text-gray-600" />
              <div>
                <div className="text-sm font-medium text-gray-900">Template CSV</div>
                <div className="text-xs text-gray-500">Baixe o template para ver o formato correto</div>
              </div>
            </div>
            <button
              onClick={downloadTemplate}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Download size={16} />
              <span>Baixar</span>
            </button>
          </div>

          {/* Upload File */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Selecionar Ficheiro CSV</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-center space-x-3">
                  <FileText size={24} className="text-green-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{file.name}</div>
                    <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null);
                      setImportResult(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Clique para selecionar um ficheiro
                  </button>
                  <p className="text-xs text-gray-500 mt-1">ou arraste o ficheiro para aqui</p>
                </div>
              )}
            </div>
          </div>

          {/* Process Button */}
          {file && !importResult && (
            <button
              onClick={handleProcessFile}
              disabled={isProcessing}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? 'Processando...' : 'Processar Ficheiro'}
            </button>
          )}

          {/* Results */}
          {importResult && (
            <div className="space-y-4">
              {importResult.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle size={20} className="text-green-600" />
                    <div>
                      <div className="text-sm font-medium text-green-800">
                        {importResult.data?.length} utilizadores prontos para importar
                      </div>
                      <div className="text-xs text-green-700 mt-1">
                        Clique em "Importar" para adicionar ao sistema
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <X size={20} className="text-red-600 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-red-800">Erros encontrados:</div>
                      <ul className="text-xs text-red-700 mt-1 space-y-1">
                        {importResult.errors?.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="text-sm text-yellow-800">
                    <strong>Atenção:</strong> Alguns utilizadores têm erros e não serão importados.
                    Corrija os erros no ficheiro CSV e tente novamente.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            {importResult?.success && importResult.data && (
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Importar {importResult.data.length} Utilizadores
              </button>
            )}
          </div>
        </div>
      </Modal>

      <Toast text={toast ?? ''} show={!!toast} onClose={() => setToast(null)} />
    </>
  );
};

export default UserImport;
