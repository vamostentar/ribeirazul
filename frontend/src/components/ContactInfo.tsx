export function ContactInfo() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
          Entre em Contato
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          A nossa equipa especializada está pronta para ajudar a encontrar o imóvel dos seus sonhos.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <ContactCard
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          }
          title="WhatsApp"
          description="Fale conosco agora"
          contact="+351 969 272 037"
          href="https://wa.me/351969272037"
          bgColor="bg-green-500"
          textColor="text-green-500"
        />

        <ContactCard
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
          title="Email"
          description="Envie sua dúvida"
          contact="geral@immorz.pt"
          href="mailto:geral@immorz.pt.pt"
          bgColor="bg-blue-500"
          textColor="text-blue-500"
        />

        <ContactCard
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          title="Escritório"
          description="Visite-nos pessoalmente"
          contact="Rua das Eiras nº 61 R/C Dt, 2725-297 Mem Martins"
          href="https://maps.app.goo.gl/434JPrMjixQUNEUY9"
          bgColor="bg-amber-500"
          textColor="text-amber-500"
        />
      </div>

      {/* Additional contact section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-8 text-center text-white">
        <h3 className="text-2xl font-bold mb-4">Horário de Atendimento</h3>
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div>
            <h4 className="font-semibold mb-2">Segunda a Sexta</h4>
            <p className="text-blue-100">9h00 às 20h00</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Sábados</h4>
            <p className="text-blue-100">9h00 às 19h00</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ContactCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  contact: string;
  href: string;
  bgColor: string;
  textColor: string;
}

function ContactCard({ icon, title, description, contact, href, bgColor, textColor }: ContactCardProps) {
  return (
    <a 
      href={href}
      target="_blank"
      rel="noreferrer"
      className="card card-interactive p-8 text-center group"
    >
      <div className={`w-16 h-16 ${bgColor} rounded-2xl mx-auto mb-6 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      
      <h4 className="text-xl font-bold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600 mb-4">{description}</p>
      <p className={`${textColor} font-semibold hover:underline transition-colors`}>
        {contact}
      </p>
    </a>
  );
}