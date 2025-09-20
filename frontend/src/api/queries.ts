import type { Project, PropertiesListResponse, Property, SystemSettings } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export function useSettings() {
  return useQuery<SystemSettings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/settings');
      return data;
    },
    staleTime: 1000 * 60, // 1 min
    enabled: false, // Desabilitar chamada automática
  });
}

export function useProperties(params?: Partial<{
  q: string;
  status: string;
  type: string;
  cursor: string;
  limit: number;
  sortBy: string;
  sortOrder: 'asc'|'desc';
}>) {
  return useQuery<PropertiesListResponse>({
    queryKey: ['properties', params],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/properties', { params });
      if (Array.isArray(data)) {
        return { data } as PropertiesListResponse;
      }
      return data as PropertiesListResponse;
    },
    retry: 1,
    staleTime: 0,
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Property>) => {
      const { data } = await api.post('/api/v1/properties', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Property> }) => {
      const { data } = await api.put(`/api/v1/properties/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['properties'] }),
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/properties/${id}`);
      return true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['properties'] }),
  });
}

export async function uploadMediaImage(
  file: File,
  opts?: { transform?: 'original'|'resize'|'cover'; width?: number; height?: number; quality?: number; onProgress?: (p: number) => void }
) {
  const form = new FormData();
  form.append('file', file);
  const params = {
    transform: opts?.transform ?? 'resize',
    width: opts?.width ?? 1920,
    height: opts?.height ?? 1080,
    quality: opts?.quality ?? 85,
  };
  const { data } = await api.post('/api/v1/media/upload', form, {
    params,
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (!opts?.onProgress || !evt.total) return;
      opts.onProgress(Math.round((evt.loaded * 100) / evt.total));
    },
  });
  return data?.data?.url as string | undefined;
}

// Upload múltiplas imagens para o media service
export async function uploadMultipleMediaImages(
  files: File[],
  opts?: { transform?: 'original'|'resize'|'cover'; width?: number; height?: number; quality?: number; onProgress?: (p: number) => void }
): Promise<string[]> {
  const uploadPromises = files.map(async (file, index) => {
    const progressCallback = opts?.onProgress
      ? (progress: number) => {
          // Calcular progresso total baseado no índice do arquivo
          const totalProgress = Math.round(((index * 100) + progress) / files.length);
          opts.onProgress!(totalProgress);
        }
      : undefined;

    return await uploadMediaImage(file, { ...opts, onProgress: progressCallback });
  });

  const results = await Promise.allSettled(uploadPromises);
  const urls: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      urls.push(result.value);
    } else if (result.status === 'rejected') {
      console.error(`Failed to upload file ${files[index].name}:`, result.reason);
    }
  });

  return urls;
}

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/projects');
      return data;
    },
    enabled: false, // Desabilitar chamada automática
  });
}

// Associar imagem já uploadada a uma propriedade (fluxo híbrido)
export async function associateImageToProperty(
  propertyId: string,
  imageUrl: string,
  extra?: { alt?: string; order?: number; }
) {
  const form = new FormData();
  form.append('imageUrl', imageUrl);
  if (extra?.alt) form.append('alt', extra.alt);
  if (typeof extra?.order === 'number') form.append('order', String(extra.order));

  const { data } = await api.post(`/api/v1/properties/${propertyId}/images`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data?.data;
}

// Upload múltiplas imagens e associar a uma propriedade (fluxo simplificado)
export async function uploadPropertyImages(
  propertyId: string,
  files: File[],
  opts?: {
    transform?: 'original'|'resize'|'cover';
    width?: number;
    height?: number;
    quality?: number;
    onProgress?: (percent: number) => void;
    onImageProgress?: (imageIndex: number, percent: number) => void;
  }
): Promise<string[]> {
  console.log(`🖼️ Iniciando upload de ${files.length} imagens para propriedade ${propertyId}`);

  // Validações iniciais
  if (!propertyId) {
    throw new Error('PropertyId é obrigatório');
  }

  if (!files || files.length === 0) {
    console.log('ℹ️ Nenhum arquivo para upload');
    return [];
  }

  // Validar arquivos
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (file.size > maxFileSize) {
      throw new Error(`Arquivo ${file.name} é muito grande. Máximo: 10MB`);
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Tipo de arquivo não suportado: ${file.type}. Use JPEG, PNG ou WebP`);
    }

    console.log(`✅ Arquivo ${i + 1} validado:`, {
      name: file.name,
      size: `${Math.round(file.size / 1024)}KB`,
      type: file.type
    });
  }

  try {
    const results: string[] = [];
    // Array para controlar o progresso de cada imagem
    const imageProgresses: number[] = new Array(files.length).fill(0);

    // Função para calcular progresso total baseado no progresso de cada imagem
    const calculateTotalProgress = (): number => {
      const totalProgress = imageProgresses.reduce((sum, progress) => sum + progress, 0);
      return Math.round(totalProgress / files.length);
    };

    // Inicializar progresso como 0% para todas as imagens
    if (opts?.onProgress) {
      opts.onProgress(0);
    }
    if (opts?.onImageProgress) {
      files.forEach((_, index) => {
        opts.onImageProgress!(index, 0);
      });
    }

    // Upload cada imagem através do api-gateway para garantir consistência
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📤 Fazendo upload do arquivo ${i + 1}/${files.length}: ${file.name}`);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('alt', `Imagem ${i + 1} - ${file.name}`);
      formData.append('order', String(i + 1));

      console.log(`📤 Enviando FormData para arquivo ${i + 1}:`, {
        fileName: file.name,
        fileSize: `${Math.round(file.size / 1024)}KB`,
        fileType: file.type,
        formDataKeys: Array.from(formData.keys()),
        propertyId
      });

      try {
        // Marcar imagem como em progresso inicial
        imageProgresses[i] = 1;
        if (opts?.onImageProgress) {
          opts.onImageProgress(i, 1);
        }
        if (opts?.onProgress) {
          const totalProgress = calculateTotalProgress();
          opts.onProgress(totalProgress);
        }

        // Log da tentativa de upload
        console.log(`📡 Tentando upload via API:`, {
          url: `/api/v1/properties/${propertyId}/images`,
          method: 'POST',
          timeout: 300000,
          apiBaseURL: api.defaults.baseURL,
          fileSize: file.size,
          fileName: file.name,
          fileType: file.type,
          propertyId
        });

        // Usar o api-gateway (porta 8081) em vez de ir diretamente para o properties-service
        const { data } = await api.post(`/api/v1/properties/${propertyId}/images`, formData, {
          // Não definir Content-Type manualmente - deixar o Axios definir automaticamente com boundary
          timeout: 300000, // 5 minutos para uploads grandes
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total && progressEvent.total > 0) {
              const fileProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);

              // Atualizar progresso desta imagem específica
              imageProgresses[i] = fileProgress;

              console.log(`📊 Progresso da imagem ${i + 1}: ${fileProgress}%`);

              // Callback para progresso individual da imagem - CHAMADO IMEDIATAMENTE
              if (opts?.onImageProgress) {
                // Usar setTimeout para garantir que o callback seja executado na próxima tick
                setTimeout(() => {
                  opts.onImageProgress!(i, fileProgress);
                }, 0);
              }

              // Callback para progresso total baseado na média de todas as imagens
              if (opts?.onProgress) {
                const totalProgress = calculateTotalProgress();
                // Usar setTimeout para garantir que o callback seja executado na próxima tick
                setTimeout(() => {
                  opts.onProgress!(Math.max(1, totalProgress));
                }, 0);
              }
            } else if (progressEvent.loaded > 0) {
              // Fallback quando total não está disponível - usar estimativa por tamanho
              const estimatedProgress = Math.min(95, Math.round((progressEvent.loaded / file.size) * 100));
              imageProgresses[i] = estimatedProgress;

              console.log(`📊 Progresso estimado da imagem ${i + 1}: ${estimatedProgress}%`);

              if (opts?.onImageProgress) {
                setTimeout(() => {
                  opts.onImageProgress!(i, estimatedProgress);
                }, 0);
              }

              if (opts?.onProgress) {
                const totalProgress = calculateTotalProgress();
                setTimeout(() => {
                  opts.onProgress!(Math.max(1, totalProgress));
                }, 0);
              }
            }
          },
        });

        console.log(`📡 Resposta da API recebida para arquivo ${i + 1}:`, {
          status: data ? 'success' : 'no-data',
          data: data,
          hasSuccess: !!data?.success,
          hasData: !!data?.data,
          fileName: file.name
        });

        if (data?.success && data?.data) {
          console.log(`✅ Arquivo ${i + 1} upload concluído com sucesso:`, {
            url: data.data.url,
            id: data.data.id,
            alt: data.data.alt,
            order: data.data.order
          });
          results.push(data.data.url || data.data.filename || `uploaded-${i+1}`);

          // Marcar imagem como 100% concluída
          imageProgresses[i] = 100;
          if (opts?.onImageProgress) {
            setTimeout(() => {
              opts.onImageProgress!(i, 100);
            }, 0);
          }

          // Atualizar progresso total final
          if (opts?.onProgress) {
            const totalProgress = calculateTotalProgress();
            setTimeout(() => {
              opts.onProgress!(totalProgress);
            }, 0);
          }
        } else {
          console.warn(`⚠️ Resposta inesperada para arquivo ${i + 1}:`, {
            data: data,
            expectedFormat: { success: true, data: { url: '...', id: '...' } },
            receivedFormat: data
          });
          throw new Error(`Resposta inválida do servidor para arquivo ${file.name}`);
        }

      } catch (fileError) {
        console.error(`💥 Erro no upload do arquivo ${i + 1} (${file.name}):`, {
          error: fileError,
          message: fileError instanceof Error ? fileError.message : 'Erro desconhecido',
          status: (fileError as any)?.response?.status,
          statusText: (fileError as any)?.response?.statusText,
          responseData: (fileError as any)?.response?.data,
          config: {
            url: (fileError as any)?.config?.url,
            method: (fileError as any)?.config?.method,
            timeout: (fileError as any)?.config?.timeout,
            baseURL: (fileError as any)?.config?.baseURL
          }
        });

        // Marcar imagem como erro
        imageProgresses[i] = 0;
        if (opts?.onImageProgress) {
          setTimeout(() => {
            opts.onImageProgress!(i, 0);
          }, 0);
        }

        // Atualizar progresso total
        if (opts?.onProgress) {
          const totalProgress = calculateTotalProgress();
          setTimeout(() => {
            opts.onProgress!(totalProgress);
          }, 0);
        }

        // Tentar extrair mensagem de erro mais específica
        let errorMessage = 'Erro desconhecido no upload';
        if (fileError instanceof Error) {
          errorMessage = fileError.message;
        } else if (typeof fileError === 'object' && fileError !== null) {
          const axiosError = fileError as any;
          if (axiosError.response?.data?.message) {
            errorMessage = axiosError.response.data.message;
          } else if (axiosError.response?.data?.error) {
            errorMessage = axiosError.response.data.error;
          }
        }

        throw new Error(`Falha no upload do arquivo ${file.name}: ${errorMessage}`);
      }
    }

    // Garantir que o progresso final seja 100%
    if (opts?.onProgress) {
      opts.onProgress(100);
    }

    console.log(`🎉 Upload concluído com sucesso: ${results.length} imagens`);
    return results;
  } catch (error) {
    console.error('💥 Falha geral no upload das imagens:', error);

    // Re-throw com mensagem mais clara
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Falha crítica no upload das imagens');
  }
}

export async function deleteImage(imageId: string) {
  await api.delete(`/api/v1/images/${imageId}`);
}

export async function reorderImages(propertyId: string, images: { id: string; order: number }[]) {
  await api.put(`/api/v1/properties/${propertyId}/images/reorder`, { images });
}

export function usePropertyImages(propertyId: string) {
  return useQuery<{ id: string; propertyId: string; url: string; alt: string | null; order: number; createdAt: string }[]>({
    queryKey: ['property-images', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/properties/${propertyId}/images`);
      return data?.data ?? [];
    },
  });
}

export function useProperty(propertyId: string) {
  return useQuery<Property>({
    queryKey: ['property', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/properties/${propertyId}`);
      return data?.data ?? data;
    },
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdatePropertyAdminStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ propertyId, adminStatus }: { propertyId: string; adminStatus: 'ACTIVE' | 'PENDING' | 'INACTIVE' }) => {
      const { data } = await api.patch(`/api/v1/properties/${propertyId}/admin-status`, { adminStatus });
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidar todas as queries relacionadas com propriedades
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', variables.propertyId] });
      
      // Forçar refetch imediato
      queryClient.refetchQueries({ queryKey: ['properties'] });
      
      console.log('✅ Estado administrativo atualizado:', variables.adminStatus);
    },
    onError: (error) => {
      console.error('❌ Erro ao atualizar estado administrativo:', error);
    },
  });
}