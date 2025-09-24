import { config } from '@/config';
import { hashPassword } from '@/utils/crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    let adminUser: any | null = null;
    // Create default roles
    console.log('📝 Creating default roles...');
    
    const superAdminRole = await prisma.role.upsert({
      where: { name: 'super_admin' },
      update: {},
      create: {
        name: 'super_admin',
        displayName: 'Super Administrator',
        description: 'Full system access with all permissions',
        permissions: ['*'], // Wildcard permission
        isActive: true,
      },
    });

    const adminRole = await prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Administrative access to user and system management',
        permissions: [
          'users.read',
          'users.create',
          'users.update',
          'users.activate',
          'users.deactivate',
          'roles.read',
          'roles.create',
          'roles.update',
          'sessions.read',
          'sessions.terminate',
          'sessions.manage_all',
          'audit_logs.read',
          'settings.read',
          'settings.update',
          'analytics.read',
          'system.health.read',
        ],
        isActive: true,
      },
    });

    const managerRole = await prisma.role.upsert({
      where: { name: 'manager' },
      update: {},
      create: {
        name: 'manager',
        displayName: 'Manager',
        description: 'Management access to users and basic system functions',
        permissions: [
          'users.read',
          'users.create',
          'users.update',
          'roles.read',
          'sessions.read',
          'audit_logs.read',
          'analytics.read',
        ],
        isActive: true,
      },
    });

    const operatorRole = await prisma.role.upsert({
      where: { name: 'operator' },
      update: {},
      create: {
        name: 'operator',
        displayName: 'Operator',
        description: 'Basic operational access',
        permissions: [
          'users.read',
          'sessions.read',
        ],
        isActive: true,
      },
    });

    console.log('✅ Default roles created successfully');

    // Create default admin user if enabled
    if (config.SEED_DEFAULT_ADMIN) {
      console.log('👤 Creating default admin user...');
      
      const hashedPassword = await hashPassword(config.DEFAULT_ADMIN_PASSWORD);
      
      adminUser = await prisma.user.upsert({
        where: { email: config.DEFAULT_ADMIN_EMAIL },
        update: {},
        create: {
          email: config.DEFAULT_ADMIN_EMAIL,
          firstName: 'System',
          lastName: 'Administrator',
          password: hashedPassword,
          isActive: true,
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
          roleId: superAdminRole.id,
        },
      });

      console.log(`✅ Default admin user created: ${adminUser.email}`);
      console.log(`🔑 Default password: ${config.DEFAULT_ADMIN_PASSWORD}`);
      console.log('⚠️  IMPORTANT: Change the default password after first login!');
    }

    // Create default auth settings
    console.log('⚙️ Creating default auth settings...');
    
    await prisma.authSettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: {
        id: 'singleton',
        passwordMinLength: 8,
        passwordRequireUpper: true,
        passwordRequireLower: true,
        passwordRequireNumber: true,
        passwordRequireSymbol: false,
        passwordHistoryCount: 5,
        maxLoginAttempts: 5,
        lockoutDuration: 900, // 15 minutes
        lockoutWindow: 300,   // 5 minutes
        sessionTimeout: 86400, // 24 hours
        maxConcurrentSessions: 5,
        jwtAccessExpiry: 3600,   // 1 hour
        jwtRefreshExpiry: 604800, // 7 days
        twoFactorRequired: false,
        twoFactorGracePeriod: 86400, // 24 hours
        emailVerificationRequired: true,
        emailVerificationExpiry: 86400, // 24 hours
        passwordResetExpiry: 3600, // 1 hour
      },
    });

    console.log('✅ Default auth settings created successfully');

    // Create sample API key for testing (development only)
    if (config.isDevelopment) {
      console.log('🔑 Creating sample API key for development...');
      
      const apiKeyValue = 'rz_dev_sample_key_12345678901234567890123456789012';
      const keyHash = require('crypto').createHash('sha256').update(apiKeyValue).digest('hex');
      
      await prisma.apiKey.upsert({
        where: { keyHash },
        update: {},
        create: {
          name: 'Development Sample Key',
          keyHash,
          keyPreview: 'rz_dev_s...',
          permissions: ['users.read', 'roles.read'],
          scopes: ['read:users', 'read:roles'],
          isActive: true,
          createdBy: adminUser?.id,
        },
      });

      console.log('✅ Sample API key created for development');
      console.log(`🔑 API Key: ${apiKeyValue}`);
      console.log('⚠️  This key is for development only!');
    }

    console.log('🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
