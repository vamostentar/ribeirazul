import { sendContactMessage } from '@/api/messages';
import { useProjects, useProperties, useSettings } from '@/api/queries';
import { ContactInfo } from '@/components/ContactInfo';
import { Hero } from '@/components/Hero';
import { Navbar } from '@/components/Navbar';
import { ProjectItem } from '@/components/ProjectItem';
import { PropertiesArea } from '@/components/PropertiesArea';
import { ListSkeleton } from '@/components/Skeleton';
import { useEffect, useState } from 'react';

export default function Home() {
  const { data: settings } = useSettings();
  const { data: propsResp, isLoading: propsLoading } = useProperties({ limit: 12, sortBy: 'createdAt', sortOrder: 'desc' });
  const properties = Array.isArray(propsResp) ? propsResp : (propsResp?.data ?? []);
  const { data: projects = [], isLoading: projectsLoading } = useProjects();

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <Hero heroUrl="https://images.unsplash.com/photo-1679364297777-1db77b6199be?auto=format&fit=crop&w=1600&q=80" />

      {/* Properties Section */}
      <section id="imoveis" className="py-20 bg-gradient-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Imóveis em Destaque
            </h2>
            <div className="flex items-center justify-center gap-4 text-lg text-gray-600">
              <span className="badge bg-blue-100 text-blue-700 px-4 py-2">
                {propsLoading ? 'Carregando...' : `${properties.length} disponíveis`}
              </span>
            </div>
          </div>
          <PropertiesArea properties={properties} loading={propsLoading} />
        </div>
      </section>

      {/* Projects Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="animate-fade-in-up">
              <img 
                className="rounded-3xl shadow-2xl w-full" 
                src="https://images.unsplash.com/photo-1527335988388-b40ee248d80c?auto=format&fit=crop&w=1200&q=80" 
                alt="Construção" 
              />
            </div>
            <div className="animate-fade-in-up animate-stagger-1">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Obras em Destaque
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Transformamos espaços com qualidade e inovação. Nossos projetos refletem excelência em cada detalhe.
              </p>
              
              {projectsLoading ? (
                <ListSkeleton rows={4} />
              ) : projects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Nenhum projeto disponível no momento.</p>
                  <p className="text-sm text-gray-500 mt-2">Volte em breve para ver nossos novos projetos.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {projects.map((project, index) => (
                    <ProjectItem 
                      key={project.id} 
                      project={project} 
                      index={index} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contato" className="py-20 bg-gradient-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ContactInfo />
        </div>
      </section>

      {/* Lead Form Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LeadForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <img 
                  src="/logo.svg" 
                  alt="RibeiraZul" 
                  className="h-12 w-auto"
                />
              </div>
              <p className="text-gray-500 text-sm">Transformando sonhos em realidade</p>
            </div>
            
            <div className="text-center">
              <p className="text-gray-400">
                © {new Date().getFullYear()} {settings?.brandName ?? 'RibeiraZul'}. 
                <span className="block mt-1">Todos os direitos reservados.</span>
              </p>
            </div>
            
            <div className="flex justify-center md:justify-end gap-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Twitter">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Facebook">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors" aria-label="Pinterest">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.219-5.175 1.219-5.175s-.311-.623-.311-1.544c0-1.446.839-2.525 1.883-2.525.888 0 1.317.664 1.317 1.46 0 .891-.568 2.224-.861 3.46-.245 1.037.52 1.881 1.545 1.881 1.854 0 3.279-1.954 3.279-4.776 0-2.499-1.796-4.244-4.356-4.244-2.968 0-4.708 2.226-4.708 4.526 0 .896.344 1.856.775 2.378a.341.341 0 0 1 .078.331c-.086.36-.275 1.122-.312 1.278-.049.2-.16.242-.369.146-1.358-.629-2.207-2.604-2.207-4.186 0-3.294 2.393-6.319 6.898-6.319 3.621 0 6.437 2.58 6.437 6.034 0 3.6-2.269 6.494-5.42 6.494-1.058 0-2.055-.549-2.394-1.275l-.651 2.479c-.235.899-.869 2.028-1.294 2.716.975.301 2.011.461 3.079.461 6.621 0 11.99-5.367 11.99-11.988C24.007 5.367 18.637.001 12.017.001z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function LeadForm() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyDetails, setPropertyDetails] = useState<string>('');

  // Check for property details in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const propertyParam = urlParams.get('property');
    if (propertyParam) {
      setPropertyDetails(decodeURIComponent(propertyParam));
    }
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      setError(null);
      
      // Extract form data
      const formData = new FormData(e.currentTarget);
      const messageData = {
        fromName: formData.get('name') as string,
        fromEmail: formData.get('email') as string,
        phone: formData.get('phone') as string,
        body: formData.get('message') as string,
        context: {
          source: 'website_contact_form',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        }
      };
      
      // Send message via API Gateway to messages service
      const response = await sendContactMessage(messageData);
      
      if (response.success) {
        console.log('Mensagem enviada com sucesso!', response.data);
        setDone(true);
        e.currentTarget.reset();
      } else {
        throw new Error(response.error || 'Falha no envio');
      }
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      setError(error.message || 'Não foi possível enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="text-center space-y-12 animate-fade-in-up">
      <div>
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Pronto para encontrar seu próximo imóvel?
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Fale com nossos especialistas e receba atendimento personalizado para suas necessidades.
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="card p-8 md:p-12">
          {done ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Mensagem enviada!</h3>
              <p className="text-gray-600 mb-8">Entraremos em contato em breve. Obrigado!</p>
              <button 
                onClick={() => setDone(false)}
                className="btn btn-outline"
              >
                Enviar nova mensagem
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                Fale com um especialista
              </h3>
              <form onSubmit={onSubmit} className="space-y-6">
                <div>
                  <input 
                    name="name" 
                    placeholder="Seu nome completo" 
                    className="input" 
                    required 
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <input 
                    name="email" 
                    placeholder="Seu melhor email" 
                    type="email" 
                    className="input" 
                    required
                  />
                  <input 
                    name="phone" 
                    placeholder="Seu telefone/WhatsApp" 
                    className="input" 
                    required
                  />
                </div>
                
                <div>
                  <textarea 
                    name="message" 
                    placeholder="Como podemos ajudar? Descreva o tipo de imóvel que procura, localização preferida, orçamento, etc."
                    className="input" 
                    rows={5}
                    required
                    defaultValue={propertyDetails}
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}
                
                <button 
                  disabled={submitting} 
                  className="btn btn-primary w-full text-lg py-4"
                >
                  {submitting ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <span>Enviar Mensagem</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}