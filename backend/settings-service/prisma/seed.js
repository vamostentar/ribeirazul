"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const settings_1 = require("../src/types/settings");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Iniciando seed do banco de dados...');
    try {
        const existingSettings = await prisma.settings.findUnique({
            where: { id: 'singleton' },
        });
        if (existingSettings) {
            console.log('✅ Configurações já existem, pulando seed');
            return;
        }
        const settings = await prisma.settings.create({
            data: {
                id: 'singleton',
                brandName: settings_1.DEFAULT_SETTINGS.brandName,
                primaryColor: settings_1.DEFAULT_SETTINGS.primaryColor,
                secondaryColor: settings_1.DEFAULT_SETTINGS.secondaryColor,
                accentColor: settings_1.DEFAULT_SETTINGS.accentColor,
                backgroundColor: settings_1.DEFAULT_SETTINGS.backgroundColor,
                textColor: settings_1.DEFAULT_SETTINGS.textColor,
                contactEmail: settings_1.DEFAULT_SETTINGS.contactEmail,
                contactPhone: settings_1.DEFAULT_SETTINGS.contactPhone,
                contactAddress: settings_1.DEFAULT_SETTINGS.contactAddress,
                socialLinks: settings_1.DEFAULT_SETTINGS.socialLinks,
                businessHours: settings_1.DEFAULT_SETTINGS.businessHours,
                businessConfig: settings_1.DEFAULT_SETTINGS.businessConfig,
                maintenanceMode: settings_1.DEFAULT_SETTINGS.maintenanceMode,
            },
        });
        console.log('✅ Configurações padrão criadas:', {
            id: settings.id,
            brandName: settings.brandName,
            primaryColor: settings.primaryColor,
        });
        const moduleSettings = [
            {
                moduleName: 'auth',
                settingsKey: 'maxLoginAttempts',
                settingsValue: 5,
                description: 'Máximo de tentativas de login antes do bloqueio',
            },
            {
                moduleName: 'auth',
                settingsKey: 'lockoutDuration',
                settingsValue: 900,
                description: 'Duração do bloqueio em segundos (15 minutos)',
            },
            {
                moduleName: 'auth',
                settingsKey: 'sessionTimeout',
                settingsValue: 86400,
                description: 'Timeout da sessão em segundos (24 horas)',
            },
            {
                moduleName: 'media',
                settingsKey: 'maxFileSize',
                settingsValue: 10485760,
                description: 'Tamanho máximo de arquivo em bytes (10MB)',
            },
            {
                moduleName: 'media',
                settingsKey: 'allowedFileTypes',
                settingsValue: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
                description: 'Tipos de arquivo permitidos',
            },
            {
                moduleName: 'properties',
                settingsKey: 'maxPropertiesPerPage',
                settingsValue: 20,
                description: 'Máximo de propriedades por página',
            },
            {
                moduleName: 'properties',
                settingsKey: 'enableGeolocation',
                settingsValue: true,
                description: 'Habilitar geolocalização para propriedades',
            },
        ];
        for (const setting of moduleSettings) {
            await prisma.moduleSettings.create({
                data: setting,
            });
        }
        console.log(`✅ ${moduleSettings.length} configurações de módulo criadas`);
        console.log('🎉 Seed concluído com sucesso!');
    }
    catch (error) {
        console.error('❌ Erro durante o seed:', error);
        throw error;
    }
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map