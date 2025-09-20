import { useState } from 'react';
import { Link } from 'react-router-dom';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/90 border-b border-gray-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="/logo.svg" 
              alt="RibeiraZul" 
              className="h-12 w-auto transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a 
              href="#imoveis" 
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors relative group"
            >
              Imóveis
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full" />
            </a>
            <a 
              href="#contato" 
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors relative group"
            >
              Contato
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full" />
            </a>
            <Link 
              to="/admin/dashboard" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Painel Admin
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            type="button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden transition-all duration-300 ${mobileMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
          <div className="py-4 space-y-4 border-t border-gray-200 mt-4">
            <a 
              href="#imoveis" 
              className="block text-gray-700 hover:text-blue-600 font-medium transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Imóveis
            </a>
            <a 
              href="#contato" 
              className="block text-gray-700 hover:text-blue-600 font-medium transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contato
            </a>
            <Link 
              to="/admin/dashboard" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-center block"
              onClick={() => setMobileMenuOpen(false)}
            >
              Painel Admin
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}