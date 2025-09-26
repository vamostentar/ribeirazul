import { useProperty, usePropertyImages } from '@/api/queries';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Eye, MapPin, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

export default function PropertyDetails() {
  const { id } = useParams<{ id: string }>();
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  
  const { data: property, isLoading: propertyLoading, error: propertyError } = useProperty(id || '');
  const { data: images = [], isLoading: imagesLoading } = usePropertyImages(id || '');

  const openImageModal = (index: number) => {
    setSelectedImageIndex(index);
  };

  const closeImageModal = () => {
    setSelectedImageIndex(null);
  };

  const nextImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex < images.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  const prevImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  if (propertyLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-gray-600">A carregar propriedade...</p>
        </div>
      </div>
    );
  }

  if (propertyError || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Propriedade não encontrada</h3>
          <p className="text-gray-600 mb-6">A propriedade que procura não existe ou foi removida.</p>
          <Link to="/" className="btn btn-primary">
            Voltar à página principal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                     <div className="flex items-center gap-4">
             <Link 
               to="/" 
               className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
             >
               <ArrowLeft size={20} />
               <span>Voltar</span>
             </Link>
             <Link 
               to="/" 
               className="flex items-center gap-3 group hover:opacity-80 transition-opacity"
             >
               <img 
                 src="/logo.svg" 
                 alt="RibeiraZul" 
                 className="h-12 w-auto transition-transform duration-300 group-hover:scale-105"
               />
             </Link>
           </div>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-sky-700">Imóveis</Link>
            <Link to="#contato" className="hover:text-sky-700">Contato</Link>
            <Link to="/admin/dashboard" className="btn btn-primary text-sm">Painel Admin</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Imagens */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {imagesLoading ? (
                <div className="aspect-video bg-gray-200 animate-pulse flex items-center justify-center">
                  <div className="text-gray-500">A carregar imagens...</div>
                </div>
                             ) : images.length > 0 ? (
                 <div className="grid grid-cols-2 gap-2 p-4">
                   {images.map((image, index) => (
                     <div 
                       key={image.id} 
                       className="aspect-square overflow-hidden rounded-lg cursor-pointer group relative"
                       onClick={() => openImageModal(index)}
                     >
                       <img 
                         src={image.url} 
                         alt={image.alt || `${property.title} - Imagem ${index + 1}`}
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                       />
                       <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                           <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                           </svg>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
              ) : (
                <div className="aspect-video bg-gray-200 flex items-center justify-center">
                  <div className="text-gray-500">Nenhuma imagem disponível</div>
                </div>
              )}
            </div>
          </div>

          {/* Detalhes */}
          <div className="space-y-6">
            {/* Informações Principais */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{property.title}</h1>
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin size={16} className="mr-1" />
                    <span className="text-sm">{property.location}</span>
                  </div>
                </div>
                                 <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                   property.status === 'for_sale' ? 'bg-green-100 text-green-700' :
                   property.status === 'for_rent' ? 'bg-blue-100 text-blue-700' :
                   'bg-gray-100 text-gray-700'
                 }`}>
                   {property.status === 'for_sale' ? 'À venda' : 
                    property.status === 'for_rent' ? 'Para arrendar' : 'Vendido'}
                 </span>
              </div>

              <div className="text-3xl font-bold text-green-600 mb-4">
                €{property.price.toLocaleString('pt-PT')}
              </div>

                             {/* Características */}
               <div className="grid grid-cols-3 gap-4 mb-6">
                 <div className="text-center p-3 bg-gray-50 rounded-lg">
                   <div className="text-lg font-semibold text-gray-900">{property.bedrooms || 'N/A'}</div>
                   <div className="text-sm text-gray-600">Quartos</div>
                 </div>
                 <div className="text-center p-3 bg-gray-50 rounded-lg">
                   <div className="text-lg font-semibold text-gray-900">{property.bathrooms || 'N/A'}</div>
                   <div className="text-sm text-gray-600">Casas de banho</div>
                 </div>
                 <div className="text-center p-3 bg-gray-50 rounded-lg">
                   <div className="text-lg font-semibold text-gray-900">{property.area ? `${property.area}m²` : 'N/A'}</div>
                   <div className="text-sm text-gray-600">Área</div>
                 </div>
               </div>

              {/* Descrição */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Descrição</h3>
                <p className="text-gray-700 leading-relaxed">{property.description}</p>
              </div>

                             {/* Informações Adicionais */}
               <div className="space-y-3 text-sm text-gray-600">
                 <div className="flex items-center">
                   <Calendar size={16} className="mr-2" />
                   <span>Publicado em {property.createdAt ? new Date(property.createdAt).toLocaleDateString('pt-PT') : 'N/A'}</span>
                 </div>
                 <div className="flex items-center">
                   <Eye size={16} className="mr-2" />
                   <span>Última atualização: {property.updatedAt ? new Date(property.updatedAt).toLocaleDateString('pt-PT') : 'N/A'}</span>
                 </div>
               </div>
            </div>

            {/* Contacto */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Interessado?</h3>
              <p className="text-gray-600 mb-4">
                Entre em contacto connosco para mais informações sobre esta propriedade.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    // Create property details string
                    const propertyDetails = `
Propriedade: ${property.title}
Localização: ${property.location}
Preço: €${Number(property.price).toLocaleString('pt-PT')}
Tipo: ${property.type || 'N/A'}
Quartos: ${property.bedrooms || 'N/A'}
Casas de banho: ${property.bathrooms || 'N/A'}
Área: ${property.area ? `${property.area}m²` : 'N/A'}
Estado: ${property.status === 'for_sale' ? 'À venda' : property.status === 'for_rent' ? 'Para arrendar' : 'Vendido'}

Gostaria de agendar uma visita para esta propriedade.`.trim();

                    // Navigate to contact form with property details
                    const contactUrl = `/#contato?property=${encodeURIComponent(propertyDetails)}`;
                    window.location.href = contactUrl;
                  }}
                  className="w-full bg-sky-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-sky-700 transition-colors"
                >
                  Agendar Visita
                </button>
              </div>
            </div>
          </div>
                 </div>
       </div>

       {/* Modal de Imagem */}
       {selectedImageIndex !== null && (
         <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
           <div className="relative max-w-7xl max-h-full p-4">
             <button
               onClick={closeImageModal}
               className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-colors"
             >
               <X size={24} />
             </button>
             
             {selectedImageIndex > 0 && (
               <button
                 onClick={prevImage}
                 className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-colors"
               >
                 <ChevronLeft size={24} />
               </button>
             )}
             
             {selectedImageIndex < images.length - 1 && (
               <button
                 onClick={nextImage}
                 className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-colors"
               >
                 <ChevronRight size={24} />
               </button>
             )}
             
             <img
               src={images[selectedImageIndex]?.url}
               alt={images[selectedImageIndex]?.alt || `${property.title} - Imagem ${selectedImageIndex + 1}`}
               className="max-w-full max-h-full object-contain"
             />
             
             <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-center">
               <p className="text-sm opacity-75">
                 {selectedImageIndex + 1} de {images.length}
               </p>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }
