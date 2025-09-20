import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 text-center">
      <div>
        <h1 className="text-3xl font-bold mb-2">Página não encontrada</h1>
        <p className="text-slate-600 mb-6">A rota que tentou aceder não existe.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/" className="btn btn-outline">Ir para a Home</Link>
          <Link to="/admin/properties" className="btn btn-primary">Abrir Painel</Link>
        </div>
      </div>
    </div>
  );
}


