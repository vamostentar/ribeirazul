import { AlertCircle, CheckCircle, Upload, X } from 'lucide-react';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  url?: string;
  error?: string;
}

interface MultiImageUploadProps {
  value?: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // em MB
  acceptedFormats?: string[];
  disabled?: boolean;
  className?: string;
  onImageProgress?: (imageIndex: number, progress: number) => void;
}

export interface MultiImageUploadRef {
  updateImageProgress: (imageIndex: number, progress: number, status?: 'uploading' | 'success' | 'error', url?: string) => void;
  updateAllImagesStatus: (status: 'uploading' | 'success' | 'error') => void;
}

const MultiImageUpload = forwardRef<MultiImageUploadRef, MultiImageUploadProps>(({
  value = [],
  onChange,
  maxFiles = 10,
  maxFileSize = 10, // 10MB
  acceptedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  disabled = false,
  className = '',
}, ref) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debug: Monitorar mudanças no estado das imagens
  useEffect(() => {
    console.log(`🔄 MultiImageUpload: Componente re-renderizado com ${value.length} imagens`);
    value.forEach((img, idx) => {
      console.log(`📸 Imagem ${idx}: ${img.file.name} - Status: ${img.status} - Progresso: ${img.progress}%`);
    });
  }, [value]);

  // Expor função para atualizar progresso externamente
  const updateImageProgress = useCallback((imageIndex: number, progress: number, status?: 'uploading' | 'success' | 'error', url?: string) => {
    console.log(`🔄 MultiImageUpload: updateImageProgress chamado com imageIndex=${imageIndex}, progress=${progress}%, status=${status}, url=${url}`);
    console.log(`🔄 MultiImageUpload: Estado atual - total de imagens: ${value.length}`);

    if (imageIndex >= 0 && imageIndex < value.length) {
      const updatedImages = [...value];
      const currentImage = updatedImages[imageIndex];
      
      // Determinar o status correto baseado no progresso e status fornecido
      let finalStatus: 'uploading' | 'success' | 'error';
      if (status) {
        finalStatus = status;
      } else if (progress === 100) {
        finalStatus = 'success';
      } else if (progress >= 0) {
        finalStatus = 'uploading'; // Manter como uploading desde que progresso seja >= 0
      } else {
        finalStatus = 'uploading'; // Fallback
      }
      
      // Forçar atualização do progresso se status for 'success'
      if (finalStatus === 'success') {
        progress = 100;
      }
      
      updatedImages[imageIndex] = {
        ...currentImage,
        progress: Math.max(0, Math.min(100, progress)), // Garantir que progresso esteja entre 0-100
        status: finalStatus,
        url: url || currentImage.url,
      };
      
      console.log(`✅ MultiImageUpload: Imagem ${imageIndex} atualizada:`, {
        id: updatedImages[imageIndex].id,
        filename: updatedImages[imageIndex].file.name,
        progress: updatedImages[imageIndex].progress,
        status: updatedImages[imageIndex].status,
        url: updatedImages[imageIndex].url
      });

      // Atualizar estado imediatamente para garantir re-renderização
      console.log(`🔄 MultiImageUpload: Chamando onChange imediatamente com progresso: ${updatedImages[imageIndex].progress}%`);
      onChange(updatedImages);

      // Forçar re-render adicional se for progresso 100% (garantir que mostra sucesso)
      if (finalStatus === 'success' || progress === 100) {
        console.log(`🎉 MultiImageUpload: Forçando re-render para progresso 100%`);
        setTimeout(() => {
          const finalImages = [...updatedImages];
          finalImages[imageIndex] = {
            ...finalImages[imageIndex],
            progress: 100,
            status: 'success'
          };
          onChange(finalImages);
        }, 10);
      }
    } else {
      console.warn(`⚠️ MultiImageUpload: Índice ${imageIndex} inválido (total de imagens: ${value.length})`);
    }
  }, [value, onChange]);

  // Expor função para atualizar status de todas as imagens
  const updateAllImagesStatus = useCallback((status: 'uploading' | 'success' | 'error') => {
    console.log(`🔄 MultiImageUpload: Atualizando status de todas as imagens para: ${status}`);

    const updatedImages = value.map(img => ({
      ...img,
      status,
      progress: status === 'success' ? 100 : status === 'error' ? 0 : img.progress,
    }));
    
    console.log(`✅ MultiImageUpload: Todas as imagens atualizadas para status: ${status}`, {
      total: updatedImages.length,
      images: updatedImages.map((img, idx) => ({
        index: idx,
        filename: img.file.name,
        status: img.status,
        progress: img.progress
      }))
    });

    // Atualizar estado imediatamente
    console.log(`🔄 MultiImageUpload: Chamando onChange para todas as imagens`);
    onChange(updatedImages);
  }, [value, onChange]);

  // Expor funções via ref para o componente pai
  useImperativeHandle(ref, () => ({
    updateImageProgress,
    updateAllImagesStatus,
  }));

  const validateFile = useMemo(() => {
    return (file: File): { valid: boolean; error?: string } => {
      // Verificar tamanho
      const maxSizeBytes = maxFileSize * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        return {
          valid: false,
          error: `Arquivo muito grande. Máximo: ${maxFileSize}MB`
        };
      }

      // Verificar formato
      if (!acceptedFormats.includes(file.type)) {
        return {
          valid: false,
          error: `Formato não suportado. Use: ${acceptedFormats.join(', ')}`
        };
      }

      return { valid: true };
    };
  }, [maxFileSize, acceptedFormats]);

  const createPreviewUrl = (file: File): string => {
    return URL.createObjectURL(file);
  };

  const processFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);

    if (value.length + fileArray.length > maxFiles) {
      alert(`Máximo de ${maxFiles} imagens permitido`);
      return;
    }

    const newImages: UploadedImage[] = fileArray.map(file => {
      const validation = validateFile(file);
      const imageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return {
        id: imageId,
        file,
        preview: createPreviewUrl(file),
        status: validation.valid ? 'uploading' : 'error',
        progress: 0,
        error: validation.error,
      };
    });

    onChange([...value, ...newImages]);
  }, [value, onChange, maxFiles, validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const removeImage = useCallback((imageId: string) => {
    const updatedImages = value.filter(img => img.id !== imageId);
    // Limpar URL de preview
    const imageToRemove = value.find(img => img.id === imageId);
    if (imageToRemove?.preview) {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    onChange(updatedImages);
  }, [value, onChange]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Área de upload */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFormats.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center">
          <Upload className={`w-12 h-12 mb-4 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Arraste suas imagens aqui
          </p>
          <p className="text-sm text-gray-500 mb-4">
            ou clique para selecionar
          </p>
          <div className="text-xs text-gray-400">
            <p>Máximo: {maxFiles} imagens</p>
            <p>Formatos: {acceptedFormats.map(format => format.split('/')[1]).join(', ')}</p>
            <p>Tamanho máximo: {maxFileSize}MB por imagem</p>
          </div>
        </div>
      </div>

      {/* Lista de imagens */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {value.map((image) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={image.preview}
                  alt={image.file.name}
                  className="w-full h-full object-cover"
                />

                {/* Overlay de status */}
                <div className={`
                  absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center
                  ${image.status === 'uploading' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                  transition-opacity
                `}>
                  {image.status === 'uploading' && (
                    <div className="text-white text-center">
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
                      <div className="text-sm font-medium">
                        {image.progress > 0 ? `${image.progress}%` : 'Iniciando...'}
                      </div>
                    </div>
                  )}

                  {image.status === 'success' && (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  )}

                  {image.status === 'error' && (
                    <div className="text-white text-center">
                      <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                      <div className="text-xs">{image.error}</div>
                    </div>
                  )}
                </div>

                {/* Botão de remover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(image.id);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Nome do arquivo */}
              <div className="mt-2 text-xs text-gray-600 truncate">
                {image.file.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estatísticas */}
      {value.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{value.length} de {maxFiles} imagens</span>
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              {value.filter(img => img.status === 'success').length} carregadas
            </span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
              {value.filter(img => img.status === 'uploading').length} carregando
            </span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
              {value.filter(img => img.status === 'error').length} com erro
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

MultiImageUpload.displayName = 'MultiImageUpload';

export default MultiImageUpload;
