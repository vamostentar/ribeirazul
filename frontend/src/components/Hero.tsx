type Props = { heroUrl: string };

export function Hero({ heroUrl }: Props) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Parallax Effect */}
      <div className="absolute inset-0">
        <img 
          src={heroUrl} 
          alt="Hero" 
          className="h-full w-full object-cover transform scale-105 transition-transform duration-[10s] ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-blue-800/60 to-indigo-900/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>

      {/* Animated Background Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse animate-delay-2000" />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <div className="text-white max-w-4xl mx-auto animate-fade-in-up">
          <div className="flex flex-col items-center mb-8">
            <img 
              src="/logo.svg" 
              alt="RibeiraZul" 
              className="h-20 md:h-24 w-auto mb-6 animate-fade-in-up filter drop-shadow-lg"
            />
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-tight mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            Encontre o seu
            <span className="block bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              lar ideal
            </span>
          </h1>
          
          <p className="mt-6 text-xl md:text-2xl text-blue-100 font-light leading-relaxed animate-fade-in-up animate-stagger-1">
            Compra, venda, locação e obras com a qualidade RibeiraZul.
            <span className="block mt-2 text-lg text-blue-200">
              Mais de 10 anos transformando sonhos em realidade.
            </span>
          </p>

          {/* Enhanced CTA Buttons */}
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animate-stagger-2">
            <a 
              href="#imoveis" 
              className="btn btn-primary text-lg px-8 py-4 group"
            >
              <span>Ver Imóveis</span>
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            
            <a 
              href="#contato" 
              className="btn btn-outline text-lg px-8 py-4 group"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Fale Conosco</span>
            </a>
          </div>

          {/* Stats Section */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto animate-fade-in-up animate-stagger-3">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-amber-400">500+</div>
              <div className="text-sm text-blue-200 mt-1">Imóveis vendidos</div>
            </div>
            <div className="text-center border-x border-blue-400/30">
              <div className="text-3xl md:text-4xl font-bold text-amber-400">10+</div>
              <div className="text-sm text-blue-200 mt-1">Anos de experiência</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-amber-400">98%</div>
              <div className="text-sm text-blue-200 mt-1">Clientes satisfeitos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </div>
  );
}