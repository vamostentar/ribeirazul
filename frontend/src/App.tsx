import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api/client';

export default function App() {
  const [properties, setProperties] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ brandName: 'RibeiraZul', primaryColor: '#0ea5e9' });

  useEffect(() => {
    (async () => {
      try {
        // Apenas carregar propriedades por enquanto
        const { data: props } = await api.get('/api/v1/properties');
        setProperties(props);
        
        // Definir configurações padrão sem fazer chamada à API
        setSettings({ brandName: 'RibeiraZul', primaryColor: '#0ea5e9' });
        
        // Inicializar projetos como array vazio
        setProjects([]);
      } catch (e) {
        console.error('Falha ao carregar propriedades', e);
        // Manter configurações padrão mesmo em caso de erro
        setSettings({ brandName: 'RibeiraZul', primaryColor: '#0ea5e9' });
        setProjects([]);
      }
    })();
  }, []);

  return (
    <div>
      <nav className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sky-600" />
            <span className="font-bold text-xl">RibeiraZul</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#imoveis" className="hover:text-sky-700">Imóveis</a>
            <a href="#contato" className="hover:text-sky-700">Contato</a>
            <a href="/admin/dashboard" className="btn btn-primary text-sm">Painel Administrativo</a>
          </div>
        </div>
      </nav>

      <header className="relative">
        <img src="https://images.unsplash.com/photo-1679364297777-1db77b6199be?auto=format&fit=crop&w=1600&q=80" alt="Hero" className="h-[60vh] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 absolute inset-0 flex items-center">
          <div className="text-white max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">Encontre o seu lar ideal</h1>
            <p className="mt-5 text-lg text-white/90">Compra, venda, locação e obras com a qualidade {settings.brandName}.</p>
            <div className="mt-8 flex gap-3">
              <a href="#imoveis" className="btn btn-primary">Ver Imóveis</a>
              <a href="#contato" className="btn btn-outline">Fale Conosco</a>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section id="imoveis" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Imóveis em Destaque</h2>
            <span className="badge">{properties.length} disponíveis</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((p) => (
              <div key={p.id} className="card">
                <img src={p.imageUrl || 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=60'} alt={p.title} className="h-48 w-full object-cover" />
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{p.title}</h3>
                    <span className="text-sky-700 font-semibold">€{Number(p.price ?? 0).toLocaleString('pt-PT')}</span>
                  </div>
                  <p className="text-slate-600 text-sm mt-1">{p.location}</p>
                  <div className="mt-4">
                    <Link 
                      to={`/property/${p.id}`}
                      className="btn btn-primary w-full text-center"
                    >
                      Ver Detalhes →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <img className="rounded-2xl shadow-md" src="https://images.unsplash.com/photo-1527335988388-b40ee248d80c?auto=format&fit=crop&w=1200&q=80" alt="Construção" />
            <div>
              <h2 className="text-2xl font-bold">Obras em destaque</h2>
              <ul className="mt-4 grid gap-2 list-disc pl-5 text-slate-700">
                {projects.map((pr) => (
                  <li key={pr.id}>{pr.name} — {pr.type}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="contato" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <LeadForm />
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-slate-600">
        © {new Date().getFullYear()} {settings.brandName}. Todos os direitos reservados.
      </footer>
    </div>
  );
}

function LeadForm() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      await api.post('/api/v1/leads', Object.fromEntries(form.entries()));
      setDone(true);
      e.currentTarget.reset();
    } catch (e) {
      console.error('Erro ao enviar lead', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card p-6 max-w-2xl mx-auto">
      <h3 className="text-xl font-semibold">Fale com um especialista</h3>
      <form onSubmit={onSubmit} className="mt-4 grid gap-4">
        <input name="name" placeholder="Seu nome" className="input" required />
        <div className="grid md:grid-cols-2 gap-4">
          <input name="email" placeholder="Email" type="email" className="input" />
          <input name="phone" placeholder="Telefone" className="input" />
        </div>
        <textarea name="message" placeholder="Como podemos ajudar?" className="input" rows={4} />
        <button disabled={submitting} className="btn btn-primary">
          {submitting ? 'Enviando...' : 'Enviar'}
        </button>
        {done && <p className="text-sky-700">Recebemos sua mensagem!</p>}
      </form>
    </div>
  );
}