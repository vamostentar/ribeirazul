import { api } from './client';

/**
 * Upload múltiplas imagens com progresso melhorado e robusto
 * Esta versão resolve os problemas de progresso do upload através do proxy
 */
export async function uploadPropertyImagesImproved(
  propertyId: string,
  files: File[],
  opts?: {
    transform?: 'original'|'resize'|'cover';
    width?: number;
    height?: number;
    quality?: number;
    onProgress?: (percent: number) => void;
    onImageProgress?: (imageIndex: number, percent: number) => void;
    debugMode?: boolean; // Para testar apenas o progresso sem upload real
  }
): Promise<string[]> {
  console.log(`🚀 Iniciando upload melhorado de ${files.length} imagens para propriedade ${propertyId}`);

  // MODO DEBUG: Testar apenas progresso sem fazer upload real
  if (opts?.debugMode) {
    console.log('🔧 MODO DEBUG: Testando apenas progresso de upload');
    await debugUploadProgress(files, {
      onProgress: opts.onProgress,
      onImageProgress: opts.onImageProgress
    });
    return files.map((file, idx) => `debug-upload-${idx}-${file.name}`);
  }

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

    // Estados de progresso para cada imagem
    const imageStates = files.map((file, index) => ({
      index,
      file,
      progress: 0,
      status: 'pending' as 'pending' | 'uploading' | 'completed' | 'error',
      startTime: 0,
      endTime: 0,
    }));

    // Função para calcular progresso total
    const calculateTotalProgress = (): number => {
      const totalProgress = imageStates.reduce((sum, state) => sum + state.progress, 0);
      return Math.round(totalProgress / files.length);
    };

    // Debounced progress update para evitar atualizações muito frequentes
    let progressUpdateTimer: NodeJS.Timeout | null = null;
    const debouncedProgressUpdate = () => {
      if (progressUpdateTimer) {
        clearTimeout(progressUpdateTimer);
      }
      progressUpdateTimer = setTimeout(() => {
        const totalProgress = calculateTotalProgress();
        if (opts?.onProgress) {
          opts.onProgress(Math.min(100, Math.max(0, totalProgress)));
        }
      }, 100);
    };

    // Inicializar callbacks - GARANTIR QUE SEJAM CHAMADOS
    console.log(`🚀 Inicializando callbacks de progresso para ${files.length} imagens`);
    if (opts?.onProgress) {
      console.log('🚀 Chamando opts.onProgress(0) - inicialização');
      try {
        opts.onProgress(0);
        console.log('✅ opts.onProgress(0) executado com sucesso');
      } catch (error) {
        console.error('❌ Erro ao chamar opts.onProgress(0):', error);
      }
    } else {
      console.log('⚠️ opts.onProgress não definido');
    }

    if (opts?.onImageProgress) {
      console.log('🚀 Chamando opts.onImageProgress para cada imagem - inicialização');
      files.forEach((_, index) => {
        console.log(`🚀 opts.onImageProgress(${index}, 0) - inicialização`);
        try {
          opts.onImageProgress!(index, 0);
          console.log(`✅ opts.onImageProgress(${index}, 0) executado com sucesso`);
        } catch (error) {
          console.error(`❌ Erro ao chamar opts.onImageProgress(${index}, 0):`, error);
        }
      });
    } else {
      console.log('⚠️ opts.onImageProgress não definido');
    }

    // Upload sequencial para melhor controle de progresso
    for (let i = 0; i < files.length; i++) {
      const state = imageStates[i];
      const file = state.file;

      console.log(`📤 [${i + 1}/${files.length}] Iniciando upload: ${file.name}`);
      state.status = 'uploading';
      state.startTime = Date.now();
      state.progress = 1;

      if (opts?.onImageProgress) {
        opts.onImageProgress(i, 1);
      }
      debouncedProgressUpdate();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('alt', `Imagem ${i + 1} - ${file.name}`);
      formData.append('order', String(i + 1));

      try {
        console.log(`📡 Enviando para API:`, {
          url: `/api/v1/properties/${propertyId}/images`,
          fileSize: file.size,
          fileName: file.name,
          fileType: file.type,
        });

        // Upload com configurações otimizadas
        console.log(`📡 [${i + 1}] Iniciando requisição HTTP para ${file.name}`);

        // GARANTIR QUE O PROGRESSO INICIE IMEDIATAMENTE
        state.progress = 1;
        if (opts?.onImageProgress) {
          console.log(`📊 [${i + 1}] Iniciando progresso: 1%`);
          opts.onImageProgress(i, 1);
        }
        debouncedProgressUpdate();

        // Progresso simulado garantido - INICIA ANTES DA REQUEST
        let simulatedProgress = 5;
        let isUsingRealProgress = false;
        const progressInterval = setInterval(() => {
          // Só continua simulando se não estiver usando progresso real
          if (!isUsingRealProgress && simulatedProgress < 95) {
            simulatedProgress += Math.random() * 10 + 5; // 5-15% por intervalo
            simulatedProgress = Math.min(95, simulatedProgress);
            state.progress = Math.round(simulatedProgress);

            if (opts?.onImageProgress) {
              console.log(`📊 [${i + 1}] Progresso simulado: ${state.progress}% (não há progresso real ainda)`);
              opts.onImageProgress(i, state.progress);
            }
            debouncedProgressUpdate();
          } else if (isUsingRealProgress) {
            console.log(`📊 [${i + 1}] Progresso simulado parado - usando progresso real`);
          }
        }, 300 + Math.random() * 200); // Intervalo variável: 300-500ms

        // Salvar referência do interval para limpeza
        (state as any).progressInterval = progressInterval;
        (state as any).isUsingRealProgress = () => isUsingRealProgress;

        const { data } = await api.post(`/api/v1/properties/${propertyId}/images`, formData, {
          timeout: 300000, // 5 minutos
          headers: {
            // Não definir Content-Type - deixar Axios definir automaticamente
          },
          onUploadProgress: (progressEvent) => {
            console.log(`📊 [${i + 1}] onUploadProgress chamado:`, {
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              hasTotal: !!progressEvent.total,
              fileSize: file.size
            });

            // Marcar que estamos usando progresso real agora
            if (!isUsingRealProgress) {
              isUsingRealProgress = true;
              console.log(`📊 [${i + 1}] Mudando para progresso real - parando simulação`);
            }

            if (progressEvent.total && progressEvent.total > 0) {
              // Progresso baseado em bytes transferidos - substituir progresso simulado
              const fileProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              const newProgress = Math.max(1, Math.min(99, fileProgress)); // Nunca 0% durante upload

              // Só atualizar se o progresso mudou significativamente
              if (Math.abs(newProgress - state.progress) >= 1) {
                state.progress = newProgress;
                console.log(`📊 [${i + 1}] Progresso real atualizado: ${newProgress}% (${progressEvent.loaded}/${progressEvent.total} bytes)`);

                if (opts?.onImageProgress) {
                  console.log(`📊 [${i + 1}] Chamando opts.onImageProgress(${i}, ${state.progress}) - real`);
                  opts.onImageProgress(i, state.progress);
                }
                debouncedProgressUpdate();
              }
            } else if (progressEvent.loaded > 0) {
              // Fallback quando total não está disponível
              const estimatedProgress = Math.min(95, Math.round((progressEvent.loaded / file.size) * 100));
              const newProgress = Math.max(1, estimatedProgress);

              // Só atualizar se o progresso mudou significativamente
              if (Math.abs(newProgress - state.progress) >= 1) {
                state.progress = newProgress;
                console.log(`📊 [${i + 1}] Progresso estimado atualizado: ${estimatedProgress}% (${progressEvent.loaded}/${file.size} bytes)`);

                if (opts?.onImageProgress) {
                  console.log(`📊 [${i + 1}] Chamando opts.onImageProgress(${i}, ${state.progress}) - estimado`);
                  opts.onImageProgress(i, state.progress);
                }
                debouncedProgressUpdate();
              }
            }
          },

          // Configurações adicionais para melhor confiabilidade
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });

        // Limpar interval de progresso simulado
        if ((state as any).progressInterval) {
          clearInterval((state as any).progressInterval);
          console.log(`🔄 [${i + 1}] Progresso simulado interrompido`);
        }

        // Verifica diferentes formatos de resposta
        if (data) {
          // Formato 1: { success: true, data: { url, id } }
          // Formato 2: { url, id } (resposta direta)
          const responseData = data.data || data;
          
          if (responseData?.url || responseData?.id) {
            console.log(`✅ [${i + 1}] Upload concluído:`, {
              url: responseData.url,
              id: responseData.id,
              duration: `${Date.now() - state.startTime}ms`
            });

            results.push(responseData.url || responseData.filename || `uploaded-${i+1}`);

            state.status = 'completed';
            state.progress = 100;
            state.endTime = Date.now();

            // Garantir que o progresso seja atualizado para 100% e status success
            if (opts?.onImageProgress) {
              console.log(`📊 [${i + 1}] Chamando opts.onImageProgress(${i}, 100) - upload concluído`);
              opts.onImageProgress(i, 100);
            }
            debouncedProgressUpdate();
          } else {
            console.warn(`⚠️ [${i + 1}] Formato de resposta não reconhecido:`, data);
            state.status = 'error';
            state.progress = 0;

            if (opts?.onImageProgress) {
              opts.onImageProgress(i, 0);
            }

            throw new Error(`Formato de resposta inesperado do servidor para ${file.name}`);
          }
        } else {
          console.warn(`⚠️ [${i + 1}] Resposta vazia do servidor`);
          state.status = 'error';
          state.progress = 0;

          if (opts?.onImageProgress) {
            opts.onImageProgress(i, 0);
          }

          throw new Error(`Resposta vazia do servidor para ${file.name}`);
        }

      } catch (fileError) {
        console.error(`💥 [${i + 1}] Erro no upload de ${file.name}:`, {
          error: fileError instanceof Error ? fileError.message : 'Erro desconhecido',
          status: (fileError as any)?.response?.status,
          statusText: (fileError as any)?.response?.statusText,
          duration: `${Date.now() - state.startTime}ms`
        });

        // Limpar interval de progresso simulado
        if ((state as any).progressInterval) {
          clearInterval((state as any).progressInterval);
          console.log(`🔄 [${i + 1}] Progresso simulado interrompido - erro no upload`);
        }

        state.status = 'error';
        state.progress = 0;
        state.endTime = Date.now();

        if (opts?.onImageProgress) {
          opts.onImageProgress(i, 0);
        }
        debouncedProgressUpdate();

        // Re-throw para interromper o processo
        throw fileError;
      }
    }

    // Garantir progresso final de 100%
    if (opts?.onProgress) {
      opts.onProgress(100);
    }

    const totalDuration = imageStates.reduce((sum, state) =>
      sum + (state.endTime - state.startTime), 0
    );

    console.log(`🎉 Upload concluído! ${files.length} imagens em ${totalDuration}ms`);
    return results;

  } catch (error) {
    console.error('💥 Erro geral no upload:', error);

    // Mensagens de erro mais específicas
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error('Upload cancelado por timeout. Arquivos muito grandes ou conexão lenta.');
      }
      if (error.message.includes('Network Error')) {
        throw new Error('Erro de rede. Verifique sua conexão com a internet.');
      }
      if (error.message.includes('ENOSPC')) {
        throw new Error('Espaço em disco insuficiente no servidor.');
      }
      if (error.message.includes('EACCES')) {
        throw new Error('Erro de permissões no servidor.');
      }
      throw new Error(`Falha no upload: ${error.message}`);
    }

    throw new Error('Erro desconhecido durante o upload das imagens');
  }
}

/**
 * Função de debug para testar progresso de upload sem fazer upload real
 * USO: Para testar apenas o progresso sem fazer upload real, descomente a linha abaixo
 * na função uploadPropertyImagesImproved e substitua a chamada do upload real
 */
export async function debugUploadProgress(
  files: File[],
  opts?: {
    onProgress?: (percent: number) => void;
    onImageProgress?: (imageIndex: number, percent: number) => void;
  }
): Promise<void> {
  console.log(`🔧 DEBUG: Iniciando teste de progresso com ${files.length} arquivos simulados`);

  if (opts?.onProgress) {
    opts.onProgress(0);
  }

  if (opts?.onImageProgress) {
    files.forEach((_, index) => {
      opts.onImageProgress!(index, 0);
    });
  }

  // Simular progresso para cada arquivo
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`🔧 DEBUG: Simulando upload do arquivo ${i + 1}: ${file.name}`);

    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      progress = Math.min(100, progress);

      if (opts?.onImageProgress) {
        opts.onImageProgress(i, Math.round(progress));
      }

      if (progress >= 100) {
        clearInterval(progressInterval);
        console.log(`🔧 DEBUG: Arquivo ${i + 1} concluído`);
      }
    }, 200);
  }

  // Simular progresso geral
  let totalProgress = 0;
  const totalInterval = setInterval(() => {
    totalProgress += 5;
    totalProgress = Math.min(100, totalProgress);

    if (opts?.onProgress) {
      opts.onProgress(totalProgress);
    }

    if (totalProgress >= 100) {
      clearInterval(totalInterval);
      console.log(`🔧 DEBUG: Todos os uploads concluídos`);
    }
  }, 300);

  // Aguardar conclusão
  await new Promise(resolve => setTimeout(resolve, 5000));
}

/**
 * Versão alternativa usando media-service diretamente (para comparação)
 */
export async function uploadToMediaService(
  files: File[],
  opts?: {
    onProgress?: (percent: number) => void;
    onImageProgress?: (imageIndex: number, percent: number) => void;
  }
): Promise<string[]> {
  console.log(`🎯 Fazendo upload direto para media-service: ${files.length} imagens`);

  const results: string[] = [];
  const imageProgresses: number[] = new Array(files.length).fill(0);

  const calculateTotalProgress = () => {
    const total = imageProgresses.reduce((sum, progress) => sum + progress, 0);
    return Math.round(total / files.length);
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const formData = new FormData();

    // Adicionar parâmetros de transformação
    formData.append('file', file);
    formData.append('bucket', 'images');

    try {
      console.log(`📤 Media upload [${i + 1}]: ${file.name}`);

      const { data } = await api.post('/api/v1/media/upload', formData, {
        timeout: 300000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && progressEvent.total > 0) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            imageProgresses[i] = progress;

            if (opts?.onImageProgress) {
              opts.onImageProgress(i, progress);
            }
            if (opts?.onProgress) {
              opts.onProgress(calculateTotalProgress());
            }
          }
        },
      });

      if (data?.success && data?.data?.url) {
        results.push(data.data.url);
        console.log(`✅ Media upload [${i + 1}] concluído: ${data.data.url}`);
      } else {
        throw new Error('Resposta inválida do media-service');
      }

    } catch (error) {
      console.error(`💥 Media upload [${i + 1}] falhou:`, error);
      throw error;
    }
  }

  return results;
}
