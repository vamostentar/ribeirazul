
import {
    useCreateProperty,
    useDeleteProperty,
    useProperties,
    useUpdateProperty,
    useUpdatePropertyAdminStatus
} from '@/api/queries';
import { uploadPropertyImagesImproved } from '@/api/upload-utils';
import AdminLayout from '@/components/admin/AdminLayout';
import { AdminStatusBadge } from '@/components/Badges';
import PropertyForm, { PropertyFormRef } from '@/components/forms/PropertyForm';
import Modal from '@/components/Modal';
import { ListSkeleton } from '@/components/Skeleton';
import { StatusDropdown } from '@/components/StatusDropdown';
import { Toast } from '@/components/Toast';
import {
    Eye,
    Filter,
    Pencil,
    Plus,
    Search,
    Trash2
} from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

interface PropertyRowProps {
  property: any;
  onEdit: (property: any) => void;
  onDelete: (property: any) => void;
  onQuickStatusChange: (property: any, status: 'ACTIVE' | 'PENDING' | 'INACTIVE') => void;
  isPending: boolean;
}

const PropertyRow: React.FC<PropertyRowProps> = ({
  property,
  onEdit,
  onDelete,
  onQuickStatusChange,
  isPending
}) => {
  // Verificar se a propriedade tem ID válido
  const hasValidId = property?.id && typeof property.id === 'string' && property.id.length > 0;
  
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="p-4">
        <div className="font-medium text-gray-800">{property.title}</div>
        <div className="text-sm text-gray-500">{property.type || 'Venda'}</div>
      </td>
      <td className="p-4 font-semibold text-green-600">€{Number(property.price ?? 0).toLocaleString('pt-PT')}</td>
      <td className="p-4">
        <div className="flex items-center gap-3">
          <AdminStatusBadge status={property.adminStatus || 'ACTIVE'} />
          <StatusDropdown
            value={property.adminStatus || 'ACTIVE'}
            onChange={(value) => onQuickStatusChange(property, value)}
            className="min-w-[100px]"
          />
        </div>
      </td>
      <td className="p-4 text-gray-600">{property.views || 0} visualizações</td>
      <td className="p-4">
        <div className="flex space-x-2">
          <Link
            to={`/admin/properties/${property.id}/images`}
            className={`p-2 rounded-lg transition-colors ${
              hasValidId 
                ? 'text-blue-600 hover:bg-blue-50 cursor-pointer' 
                : 'text-gray-400 cursor-not-allowed opacity-50'
            }`}
            onClick={(e) => {
              if (!hasValidId) {
                e.preventDefault();
                console.warn('⚠️ Propriedade sem ID válido:', property);
                return;
              }
              console.log('🔗 Botão Ver Detalhes clicado para propriedade:', property.id);
              console.log('🔗 URL destino:', `/admin/properties/${property.id}/images`);
            }}
            title={hasValidId ? 'Ver detalhes e imagens' : 'ID da propriedade inválido'}
          >
            <Eye size={16} />
          </Link>
          <button 
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
            onClick={() => onEdit(property)}
            title="Editar propriedade"
          >
            <Pencil size={16} />
          </button>
          <button
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            disabled={isPending}
            onClick={() => onDelete(property)}
            title="Eliminar propriedade"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default function PropertiesManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const { data: propertiesData, isLoading, error, refetch } = useProperties({
    q: searchTerm || undefined,
    cursor: cursor || undefined,
    limit: 10
  });
  const deleteProperty = useDeleteProperty();
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const updateStatus = useUpdatePropertyAdminStatus();
  const rows = useMemo(() => propertiesData?.data ?? [], [propertiesData]);
  const pagination = propertiesData?.pagination;
  const [toast, setToast] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [edit, setEdit] = useState<{ open: boolean; property?: any }>({ open: false });
  
  // Refs para os formulários
  const createFormRef = useRef<PropertyFormRef>(null);
  const editFormRef = useRef<PropertyFormRef>(null);

  const handleDelete = async (property: any) => {
    if (!confirm('Eliminar esta propriedade?')) return;
    try {
      await deleteProperty.mutateAsync(property.id);
      setToast('Propriedade eliminada com sucesso');
    } catch (error) {
      setToast('Erro ao eliminar propriedade');
    }
  };

  const handleQuickStatusChange = async (property: any, newStatus: 'ACTIVE' | 'PENDING' | 'INACTIVE') => {
    try {
      await updateStatus.mutateAsync({
        propertyId: property.id,
        adminStatus: newStatus
      });
      setToast(`Estado alterado para ${newStatus === 'ACTIVE' ? 'Ativo' : newStatus === 'PENDING' ? 'Pendente' : 'Inativo'}`);
    } catch (error) {
      setToast('Erro ao alterar estado da propriedade');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Gestão de Propriedades</h2>
          <button 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={20} />
            <span>Nova Propriedade</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text"
                  placeholder="Procurar propriedades..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="px-4 py-2 border border-gray-200 rounded-lg flex items-center space-x-2 hover:bg-gray-50">
                <Filter size={20} />
                <span>Filtros</span>
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-6">
              <ListSkeleton rows={5} />
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-left">
                <p className="text-red-700 text-sm font-semibold mb-1">Falha ao carregar propriedades</p>
                <p className="text-red-700 text-sm">Verifica a configuração da API em <code>VITE_API_URL</code> e a rota <code>/api/v1/properties</code>.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {rows.length === 0 ? (
                <div className="p-6 text-center text-gray-600">
                  Nenhuma propriedade encontrada. Clique em &quot;Nova Propriedade&quot; para criar.
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left p-4 font-semibold text-gray-700">Propriedade</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Preço</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Estado</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Visualizações</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((property: any) => (
                      <PropertyRow
                        key={property.id}
                        property={property}
                        onEdit={(p) => setEdit({ open: true, property: p })}
                        onDelete={() => handleDelete(property)}
                        onQuickStatusChange={handleQuickStatusChange}
                        isPending={deleteProperty.isPending}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination && rows.length > 0 && (
            <div className="p-6 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <button
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  disabled={!pagination?.nextCursor}
                  onClick={() => setCursor(pagination?.nextCursor || undefined)}
                >
                  Próxima página
                </button>
                <span className="text-sm text-gray-600">
                  {rows.length} / {pagination.totalEstimate ?? '—'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal open={createOpen} title="Nova Propriedade" onClose={() => setCreateOpen(false)}>
        <PropertyForm
          ref={createFormRef}
          submitting={createProperty.isPending}
          onSubmit={async (values, images) => {
            try {
              console.log('🚀 Iniciando criação de propriedade:', { values, imagesCount: images?.length });

              // Passo 1: Criar a propriedade
              console.log('📝 Criando propriedade...');
              console.log('📝 Valores enviados:', values);
              console.log('📝 AdminStatus incluído:', values.adminStatus);
              const property = await createProperty.mutateAsync(values);
              console.log('📝 Resposta da criação:', property);
              
              // Extrair o ID da propriedade criada
              const propertyId = property?.data?.id || property?.id;
              console.log('✅ Propriedade criada com ID:', propertyId);
              
              if (!propertyId) {
                throw new Error('Falha ao obter ID da propriedade criada');
              }

              // Passo 2: Se houver imagens, fazer upload usando a função otimizada
              if (images && images.length > 0 && propertyId) {
                console.log('🖼️ Fazendo upload de', images.length, 'imagens...');
                try {
                  const imageFiles = images.map(img => img.file);
                  console.log('📤 Arquivos para upload:', imageFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));

                  const uploadedUrls = await uploadPropertyImagesImproved(propertyId, imageFiles, {
                    onProgress: (progress) => {
                      console.log(`🚀 Progresso geral do upload: ${progress}%`);
                    },
                    onImageProgress: (imageIndex, progress) => {
                      console.log(`🚀 Progresso da imagem ${imageIndex + 1}: ${progress}%`);
                      // Atualizar o progresso da imagem específica no frontend
                      if (createFormRef.current) {
                        const status = progress === 100 ? 'success' : 'uploading';
                        createFormRef.current.updateImageProgress(imageIndex, progress, status);
                      }
                    }
                  });

                  console.log('✅ Upload concluído:', uploadedUrls);
                  
                  // Garantir que todas as imagens sejam marcadas como sucesso após upload completo
                  if (createFormRef.current) {
                    createFormRef.current.updateAllImagesStatus('success');
                  }
                  
                  setToast(`Propriedade criada com ${uploadedUrls.length} imagens`);
                } catch (uploadError) {
                  console.error('❌ Erro no upload das imagens:', uploadError);
                  setToast('Propriedade criada, mas houve erro no upload das imagens');
                  // Marcar todas as imagens como erro
                  if (createFormRef.current) {
                    createFormRef.current.updateAllImagesStatus('error');
                  }
                }
              } else {
                console.log('ℹ️ Nenhuma imagem para upload');
                setToast('Propriedade criada com sucesso');
              }

              // Aguardar um momento para garantir que o estado seja atualizado
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Limpar as imagens do formulário após sucesso
              if (createFormRef.current) {
                createFormRef.current.clearImages();
              }
              
              setCreateOpen(false);
              refetch();
            } catch (error) {
              console.error('💥 Erro ao criar propriedade:', error);
              setToast(`Erro ao criar propriedade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            }
          }}
        />
      </Modal>

      <Modal open={edit.open} title="Editar Propriedade" onClose={() => setEdit({ open: false })}>
        {edit.property && (
          <PropertyForm
            ref={editFormRef}
            initial={edit.property}
            submitting={updateProperty.isPending}
            onSubmit={async (values, images) => {
              try {
                // 1) Atualizar campos textuais
                console.log('📝 Atualizando propriedade...');
                console.log('📝 Valores enviados:', values);
                console.log('📝 AdminStatus incluído:', values.adminStatus);
                await updateProperty.mutateAsync({
                  id: edit.property!.id,
                  payload: values
                });

                // 2) Se houver imagens selecionadas, fazer upload e associar
                if (images && images.length > 0) {
                  try {
                    const imageFiles = images.map(img => img.file);
                    await uploadPropertyImagesImproved(edit.property!.id, imageFiles, {
                      onProgress: (progress) => {
                        console.log(`🚀 Progresso geral do upload (edição): ${progress}%`);
                      },
                      onImageProgress: (imageIndex, progress) => {
                        console.log(`🚀 Progresso da imagem ${imageIndex + 1} (edição): ${progress}%`);
                        // Atualizar o progresso da imagem específica no frontend
                        if (editFormRef.current) {
                          const status = progress === 100 ? 'success' : 'uploading';
                          editFormRef.current.updateImageProgress(imageIndex, progress, status);
                        }
                      }
                    });
                    
                    // Garantir que todas as imagens sejam marcadas como sucesso após upload completo
                    if (editFormRef.current) {
                      editFormRef.current.updateAllImagesStatus('success');
                    }
                    
                    setToast('Propriedade atualizada e imagens carregadas');
                  } catch (uploadError) {
                    console.error('❌ Erro ao carregar imagens na edição:', uploadError);
                    setToast('Propriedade atualizada. Falha ao carregar algumas imagens');
                    // Marcar todas as imagens como erro
                    if (editFormRef.current) {
                      editFormRef.current.updateAllImagesStatus('error');
                    }
                  }
                } else {
                  setToast('Propriedade atualizada com sucesso');
                }

                // Aguardar um momento para garantir que o estado seja atualizado
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Limpar as imagens do formulário após sucesso
                if (editFormRef.current) {
                  editFormRef.current.clearImages();
                }
                
                setEdit({ open: false });
                refetch();
              } catch (error) {
                setToast('Erro ao atualizar propriedade');
              }
            }}
          />
        )}
      </Modal>


      <Toast text={toast ?? ''} show={!!toast} onClose={() => setToast(null)} />
    </AdminLayout>
  );
}
