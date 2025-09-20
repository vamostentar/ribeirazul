import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding User Service database...');

  // Verificar se já existe usuário admin
  const existingAdmin = await prisma.userProfile.findUnique({
    where: { email: 'admin@ribeirazul.com' }
  });

  if (existingAdmin) {
    console.log('👑 Admin user already exists, skipping creation');
  } else {
    // Criar usuário administrador
    const adminUser = await prisma.userProfile.create({
      data: {
        firstName: 'Admin',
        lastName: 'RibeiraZul',
        email: 'admin@ribeirazul.com',
        phone: '+351910000000',
        role: UserRole.ADMIN,
        isActive: true,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        bio: 'Administrador do sistema RibeiraZul',
        preferredContactMethod: 'EMAIL',
        language: 'pt',
        timezone: 'Europe/Lisbon',
        profileVisibility: 'PRIVATE',
        allowMarketing: false,
        allowNotifications: true,
        country: 'Portugal',
        city: 'Lisboa'
      }
    });

    console.log('👑 Admin user created:', adminUser.email);

    // Criar preferências padrão para o admin
    await prisma.userPreferences.create({
      data: {
        userId: adminUser.id,
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        priceDropAlerts: false,
        newPropertyAlerts: true,
        marketUpdateAlerts: true,
        searchRadius: 50,
        sortBy: 'DATE_DESC',
        viewMode: 'LIST'
      }
    });

    console.log('⚙️ Admin preferences created');
  }

  // Criar alguns usuários cliente de exemplo (apenas em desenvolvimento)
  if (process.env.NODE_ENV === 'development') {
    const existingClient = await prisma.userProfile.findUnique({
      where: { email: 'cliente@exemplo.com' }
    });

    if (!existingClient) {
      const clientUser = await prisma.userProfile.create({
        data: {
          firstName: 'João',
          lastName: 'Silva',
          email: 'cliente@exemplo.com',
          phone: '+351910000001',
          role: UserRole.CLIENT,
          isActive: true,
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
          bio: 'Cliente interessado em propriedades',
          preferredContactMethod: 'EMAIL',
          language: 'pt',
          timezone: 'Europe/Lisbon',
          profileVisibility: 'PUBLIC',
          allowMarketing: true,
          allowNotifications: true,
          country: 'Portugal',
          city: 'Porto',
          dateOfBirth: new Date('1985-03-15')
        }
      });

      await prisma.userPreferences.create({
        data: {
          userId: clientUser.id,
          propertyTypes: ['APARTMENT', 'HOUSE'],
          minPrice: 100000,
          maxPrice: 500000,
          minBedrooms: 2,
          maxBedrooms: 4,
          minBathrooms: 1,
          maxBathrooms: 3,
          preferredLocation: 'Porto',
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
          priceDropAlerts: true,
          newPropertyAlerts: true,
          marketUpdateAlerts: false,
          searchRadius: 20,
          sortBy: 'PRICE_ASC',
          viewMode: 'GRID'
        }
      });

      console.log('👤 Demo client user created:', clientUser.email);
    }
  }

  console.log('✅ User Service database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
