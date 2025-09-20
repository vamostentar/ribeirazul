import { deleteImage, reorderImages, usePropertyImages } from '@/api/queries';
import { uploadPropertyImagesImproved } from '@/api/upload-utils';
import { Toast } from '@/components/Toast';
import React, { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function PropertyImages() {
  const { id = '' } = useParams();
  const { data = [], refetch, isFetching } = usePropertyImages(id);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [toast, setToast] = useState<string | null>(null);

  const sorted = useMemo(() => [...data].sort((a, b) => a.order - b.order), [data]);

  const onUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !id) return;
    setUploading(true);
    try {
      const files = Array.from(e.target.files);
      await uploadPropertyImagesImproved(id, files, {
        onProgress: (p: number) => {
          console.log(`🚀 Progresso do upload: ${p}%`);
          setProgress(p);
        },
        onImageProgress: (imageIndex, progress) => {
          console.log(`🚀 Progresso da imagem ${imageIndex + 1}: ${progress}%`);
        }
      });
      await refetch();
      setToast('Imagens carregadas');
    } finally {
      setUploading(false);
      setProgress(0);
      e.target.value = '';
    }
  }, [id, refetch]);

  const onDelete = useCallback(async (imageId: string) => {
    if (!confirm('Remover imagem?')) return;
    await deleteImage(imageId);
    await refetch();
    setToast('Imagem removida');
  }, [refetch]);

  const onReorder = useCallback(async (direction: 'up'|'down', index: number) => {
    const next = [...sorted];
    const target = next[index];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    const swap = next[swapIdx];
    const tmp = target.order; target.order = swap.order; swap.order = tmp;
    await reorderImages(id, next.map(n => ({ id: n.id, order: n.order })));
    await refetch();
  }, [id, sorted, refetch]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Gestão de Imagens do Imóvel</h1>

      <div className="mb-6">
        <label className="btn btn-primary inline-flex items-center gap-2">
          <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onUpload} />
          <span>{uploading ? `A enviar... ${progress > 0 ? `${progress}%` : 'Iniciando...'}` : 'Carregar Imagens'}</span>
        </label>
      </div>

      {isFetching ? <p>A carregar...</p> : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {sorted.map((img, idx) => (
            <div key={img.id} className="card overflow-hidden">
              <img src={img.url} alt={img.alt ?? ''} className="h-48 w-full object-cover" />
              <div className="p-3 flex items-center justify-between">
                <div className="flex gap-2">
                  <button className="btn btn-outline" onClick={() => onReorder('up', idx)}>↑</button>
                  <button className="btn btn-outline" onClick={() => onReorder('down', idx)}>↓</button>
                </div>
                <button className="btn btn-danger" onClick={() => onDelete(img.id)}>Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Toast text={toast ?? ''} show={!!toast} onClose={() => setToast(null)} />
    </div>
  );
}


