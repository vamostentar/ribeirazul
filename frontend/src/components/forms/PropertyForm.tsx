import type { Property } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { StatusDropdown } from '../StatusDropdown';
import MultiImageUpload from './MultiImageUpload';

const schema = z.object({
  title: z.string().min(3),
  location: z.string().min(3),
  price: z.number().min(0),
  status: z.enum(['for_sale', 'for_rent', 'sold']),
  adminStatus: z.enum(['ACTIVE', 'PENDING', 'INACTIVE']).optional(),
  type: z.enum(['apartamento','moradia','loft','penthouse','estudio','escritorio','terreno']).optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  bedrooms: z.number().min(0).optional().nullable(),
  bathrooms: z.number().min(0).optional().nullable(),
  area: z.number().min(0).optional().nullable(),
});

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  url?: string;
  error?: string;
}

export type PropertyFormValues = z.infer<typeof schema>;

export interface PropertyFormRef {
  updateImageProgress: (imageIndex: number, progress: number, status?: 'uploading' | 'success' | 'error', url?: string) => void;
  updateAllImagesStatus: (status: 'uploading' | 'success' | 'error') => void;
  clearImages: () => void;
}

const PropertyForm = forwardRef<PropertyFormRef, {
  initial?: Partial<Property>;
  submitting?: boolean;
  onSubmit: (values: PropertyFormValues, images?: UploadedImage[]) => void | Promise<void>;
  onImagesUpdate?: (images: UploadedImage[]) => void;
}>(({ initial, onSubmit, submitting, onImagesUpdate }, ref) => {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PropertyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initial?.title ?? '',
      location: initial?.location ?? '',
      price: Number(initial?.price ?? 0),
      status: (initial?.status as any) ?? 'for_sale',
      adminStatus: (initial?.adminStatus as any) ?? 'ACTIVE',
      type: (initial?.type as any) ?? undefined,
      imageUrl: initial?.imageUrl ?? undefined,
      description: initial?.description ?? undefined,
      bedrooms: initial?.bedrooms ?? undefined,
      bathrooms: initial?.bathrooms ?? undefined,
      area: initial?.area ?? undefined,
    },
  });

  const [images, setImages] = useState<UploadedImage[]>([]);
  const multiImageUploadRef = useRef<any>(null);

  // Expor funções para o componente pai
  useImperativeHandle(ref, () => ({
    updateImageProgress: (imageIndex: number, progress: number, status?: 'uploading' | 'success' | 'error', url?: string) => {
      console.log(`🔄 PropertyForm: updateImageProgress chamado para imagem ${imageIndex}: ${progress}%`);
      if (multiImageUploadRef.current?.updateImageProgress) {
        multiImageUploadRef.current.updateImageProgress(imageIndex, progress, status, url);
      } else {
        console.warn(`⚠️ PropertyForm: multiImageUploadRef.current não está disponível`);
      }
    },
    updateAllImagesStatus: (status: 'uploading' | 'success' | 'error') => {
      console.log(`🔄 PropertyForm: updateAllImagesStatus chamado com status: ${status}`);
      if (multiImageUploadRef.current?.updateAllImagesStatus) {
        multiImageUploadRef.current.updateAllImagesStatus(status);
      } else {
        console.warn(`⚠️ PropertyForm: multiImageUploadRef.current não está disponível`);
      }
    },
    // Nova função para limpar o estado das imagens após sucesso
    clearImages: () => {
      console.log(`🔄 PropertyForm: clearImages chamado`);
      setImages([]);
      if (onImagesUpdate) {
        onImagesUpdate([]);
      }
    },
  }));

  // Handler para quando as imagens são selecionadas/uploadadas
  const handleImagesChange = (newImages: UploadedImage[]) => {
    setImages(newImages);
    // Notificar o componente pai sobre mudanças nas imagens
    if (onImagesUpdate) {
      onImagesUpdate(newImages);
    }
  };

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values, images))} className="grid gap-3">
      <input className="input" placeholder="Título" {...register('title')} />
      {errors.title && <span className="text-red-600 text-sm">{errors.title.message}</span>}

      <input className="input" placeholder="Localização" {...register('location')} />
      {errors.location && <span className="text-red-600 text-sm">{errors.location.message}</span>}

      <input className="input" placeholder="Preço" type="number" step="0.01" {...register('price', { valueAsNumber: true })} />
      {errors.price && <span className="text-red-600 text-sm">{errors.price.message}</span>}

      <div className="grid md:grid-cols-2 gap-3">
        <select className="input" {...register('status')}>
          <option value="for_sale">Para venda</option>
          <option value="for_rent">Para arrendar</option>
          <option value="sold">Vendido</option>
        </select>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Estado Administrativo</label>
          <StatusDropdown
            value={watch('adminStatus') || 'ACTIVE'}
            onChange={(value) => setValue('adminStatus', value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <select className="input" {...register('type')}>
          <option value="">Tipo (opcional)</option>
          <option value="apartamento">Apartamento</option>
          <option value="moradia">Moradia</option>
          <option value="loft">Loft</option>
          <option value="penthouse">Penthouse</option>
          <option value="estudio">Estúdio</option>
          <option value="escritorio">Escritório</option>
          <option value="terreno">Terreno</option>
        </select>
      </div>

      {/* Características da propriedade */}
      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <input 
            className="input" 
            placeholder="Nº de quartos" 
            type="number" 
            min="0" 
            {...register('bedrooms', { valueAsNumber: true })} 
          />
          {errors.bedrooms && <span className="text-red-600 text-sm">{errors.bedrooms.message}</span>}
        </div>
        <div>
          <input 
            className="input" 
            placeholder="Nº de casas de banho" 
            type="number" 
            min="0" 
            step="0.5" 
            {...register('bathrooms', { valueAsNumber: true })} 
          />
          {errors.bathrooms && <span className="text-red-600 text-sm">{errors.bathrooms.message}</span>}
        </div>
        <div>
          <input 
            className="input" 
            placeholder="Área (m²)" 
            type="number" 
            min="0" 
            {...register('area', { valueAsNumber: true })} 
          />
          {errors.area && <span className="text-red-600 text-sm">{errors.area.message}</span>}
        </div>
      </div>

      {/* Upload de múltiplas imagens */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Imagens da Propriedade
        </label>
        <MultiImageUpload
          ref={multiImageUploadRef}
          value={images}
          onChange={handleImagesChange}
          maxFiles={10}
          maxFileSize={10}
          disabled={submitting}
        />
      </div>

      <textarea className="input" rows={4} placeholder="Descrição (opcional)" {...register('description')} />

      <div className="flex justify-end gap-2 mt-2">
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? 'A guardar...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
});

PropertyForm.displayName = 'PropertyForm';

// Exportar tipos e funções auxiliares
export { MultiImageUpload };
export type { UploadedImage };
export default PropertyForm;


