import { FastifyInstance } from 'fastify';

export async function settingsRoutes(fastify: FastifyInstance) {
  // Get settings
  fastify.get('/api/v1/settings', async (request, reply) => {
    // For now, return default settings. In production, this could come from database
    const settings = {
      id: 'singleton',
      brandName: 'RibeiraZul',
      primaryColor: '#2563eb', // blue-600
      secondaryColor: '#1f2937', // gray-800
      contactEmail: 'contato@ribeirazul.com',
      contactPhone: '+55 11 99999-9999',
      address: 'São Paulo, SP',
      socialLinks: {
        facebook: 'https://facebook.com/ribeirazul',
        instagram: 'https://instagram.com/ribeirazul',
        linkedin: 'https://linkedin.com/company/ribeirazul'
      },
      businessHours: {
        monday: '08:00 - 18:00',
        tuesday: '08:00 - 18:00',
        wednesday: '08:00 - 18:00',
        thursday: '08:00 - 18:00',
        friday: '08:00 - 18:00',
        saturday: '09:00 - 16:00',
        sunday: 'Fechado'
      }
    };

    return reply.send({
      success: true,
      data: settings,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  });

  // Update settings (protected route - would need authentication)
  fastify.put('/api/v1/settings', async (request, reply) => {
    const { brandName, primaryColor, secondaryColor } = request.body as any;

    // For now, just return success. In production, this would update database
    const updatedSettings = {
      id: 'singleton',
      brandName: brandName || 'RibeiraZul',
      primaryColor: primaryColor || '#2563eb',
      secondaryColor: secondaryColor || '#1f2937',
      updatedAt: new Date().toISOString()
    };

    return reply.send({
      success: true,
      data: updatedSettings,
      message: 'Settings updated successfully',
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  });
}
