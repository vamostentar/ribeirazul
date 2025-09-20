/**
 * Properties Routes - Consolidated Implementation
 *
 * Using existing controllers for stability and reliability
 */

import { FastifyInstance } from 'fastify';
import { propertyController } from '../controllers/property.controller';

export async function propertiesRoutes(fastify: FastifyInstance) {
  console.log('🔧 Registering Properties routes...');

  // Properties CRUD

  // Create property
  fastify.post('/api/v1/properties', {
    schema: {
      description: 'Create a new property',
      tags: ['Properties'],
      body: {
        type: 'object',
        required: ['title', 'location', 'price'],
        properties: {
          title: { type: 'string', minLength: 3, maxLength: 200 },
          location: { type: 'string', minLength: 5, maxLength: 500 },
          price: { type: 'number', minimum: 0.01 },
          status: {
            type: 'string',
            enum: ['for_sale', 'for_rent', 'sold', 'rented', 'under_contract', 'withdrawn'],
            default: 'for_sale'
          },
          type: {
            type: 'string',
            enum: ['apartamento', 'moradia', 'loft', 'penthouse', 'estudio', 'escritorio', 'terreno']
          },
          imageUrl: { type: 'string', format: 'uri' },
          description: { type: 'string', maxLength: 2000 },
          bedrooms: { type: 'integer', minimum: 0, maximum: 20 },
          bathrooms: { type: 'integer', minimum: 0, maximum: 20 },
          area: { type: 'number', minimum: 0.01, maximum: 50000 },
          yearBuilt: { type: 'integer', minimum: 1800, maximum: new Date().getFullYear() },
          coordinates: {
            type: 'object',
            properties: {
              latitude: { type: 'number', minimum: -90, maximum: 90 },
              longitude: { type: 'number', minimum: -180, maximum: 180 }
            },
            required: ['latitude', 'longitude']
          },
          features: { type: 'array', items: { type: 'string' }, maxItems: 20 },
          contactPhone: { type: 'string' },
          contactEmail: { type: 'string', format: 'email' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            data: { type: 'object', additionalProperties: true },
            message: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, propertyController.createProperty.bind(propertyController));

  // Get all properties with filters
  fastify.get('/api/v1/properties', {
    schema: {
      description: 'Get properties with filters and pagination',
      tags: ['Properties'],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['for_sale', 'for_rent', 'sold', 'rented', 'under_contract', 'withdrawn'] },
          type: { type: 'string', enum: ['apartamento', 'moradia', 'loft', 'penthouse', 'estudio', 'escritorio', 'terreno'] },
          location: { type: 'string' },
          minPrice: { type: 'number', minimum: 0 },
          maxPrice: { type: 'number', minimum: 0 },
          minBedrooms: { type: 'integer', minimum: 0 },
          maxBedrooms: { type: 'integer', minimum: 0 },
          minBathrooms: { type: 'integer', minimum: 0 },
          maxBathrooms: { type: 'integer', minimum: 0 },
          minArea: { type: 'number', minimum: 0 },
          maxArea: { type: 'number', minimum: 0 },
          minYearBuilt: { type: 'integer', minimum: 1800 },
          maxYearBuilt: { type: 'integer', maximum: new Date().getFullYear() },
          features: { type: 'array', items: { type: 'string' } },
          q: { type: 'string', minLength: 1 },
          sortBy: { type: 'string', enum: ['createdAt', 'price', 'area', 'title'], default: 'createdAt' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          cursor: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          oneOf: [
            {
              type: 'object',
              properties: {
                data: { type: 'array', items: { type: 'object', additionalProperties: true } },
                pagination: {
                  type: 'object',
                  properties: {
                    nextCursor: { type: 'string', nullable: true },
                    hasMore: { type: 'boolean' },
                    limit: { type: 'integer' },
                    totalEstimate: { type: 'integer', nullable: true }
                  }
                },
                timestamp: { type: 'string' }
              }
            },
            { type: 'array', items: { type: 'object', additionalProperties: true } }
          ]
        }
      }
    }
  }, propertyController.getProperties.bind(propertyController));

  // Get property by ID
  fastify.get('/api/v1/properties/:id', {
    schema: {
      description: 'Get a property by ID',
      tags: ['Properties'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'object', additionalProperties: true },
            timestamp: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, propertyController.getPropertyById.bind(propertyController));

  // Update property
  fastify.put('/api/v1/properties/:id', {
    schema: {
      description: 'Update a property',
      tags: ['Properties'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 3, maxLength: 200 },
          location: { type: 'string', minLength: 5, maxLength: 500 },
          price: { type: 'number', minimum: 0.01 },
          status: { type: 'string', enum: ['for_sale', 'for_rent', 'sold', 'rented', 'under_contract', 'withdrawn'] },
          type: { type: 'string', enum: ['apartamento', 'moradia', 'loft', 'penthouse', 'estudio', 'escritorio', 'terreno'] },
          imageUrl: { type: 'string', format: 'uri' },
          description: { type: 'string', maxLength: 2000 },
          bedrooms: { type: 'integer', minimum: 0, maximum: 20 },
          bathrooms: { type: 'integer', minimum: 0, maximum: 20 },
          area: { type: 'number', minimum: 0.01, maximum: 50000 },
          yearBuilt: { type: 'integer', minimum: 1800, maximum: new Date().getFullYear() },
          coordinates: {
            type: 'object',
            properties: {
              latitude: { type: 'number', minimum: -90, maximum: 90 },
              longitude: { type: 'number', minimum: -180, maximum: 180 }
            },
            required: ['latitude', 'longitude']
          },
          features: { type: 'array', items: { type: 'string' }, maxItems: 20 },
          contactPhone: { type: 'string' },
          contactEmail: { type: 'string', format: 'email' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'object', additionalProperties: true },
            message: { type: 'string' },
            timestamp: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, propertyController.updateProperty.bind(propertyController));

  // Delete property
  fastify.delete('/api/v1/properties/:id', {
    schema: {
      description: 'Delete a property',
      tags: ['Properties'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        204: {
          type: 'null'
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, propertyController.deleteProperty.bind(propertyController));

  // Get properties statistics
  fastify.get('/api/v1/properties-stats', {
    schema: {
      description: 'Get properties statistics',
      tags: ['Properties', 'Analytics'],
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                byStatus: {
                  type: 'object',
                  properties: {
                    forSale: { type: 'integer' },
                    forRent: { type: 'integer' },
                    sold: { type: 'integer' }
                  }
                },
                pricing: {
                  type: 'object',
                  properties: {
                    average: { type: 'number' },
                    median: { type: 'number' },
                    min: { type: 'number' },
                    max: { type: 'number' }
                  }
                },
                lastUpdated: { type: 'string' }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, propertyController.getPropertiesStats.bind(propertyController));

  // Search properties
  fastify.get('/api/v1/properties/search', {
    schema: {
      description: 'Search properties by text query',
      tags: ['Properties', 'Search'],
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', minLength: 3 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        },
        required: ['q']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { type: 'object' } },
            query: { type: 'string' },
            count: { type: 'integer' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, propertyController.searchProperties.bind(propertyController));

  // Find nearby properties
  fastify.get('/api/v1/properties/nearby', {
    schema: {
      description: 'Find properties near a location',
      tags: ['Properties', 'Geospatial'],
      querystring: {
        type: 'object',
        properties: {
          lat: { type: 'number', minimum: -90, maximum: 90 },
          lng: { type: 'number', minimum: -180, maximum: 180 },
          radius: { type: 'number', minimum: 0.1, maximum: 100, default: 5 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        },
        required: ['lat', 'lng']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { type: 'object', additionalProperties: true } },
            location: {
              type: 'object',
              properties: {
                latitude: { type: 'number' },
                longitude: { type: 'number' }
              }
            },
            radiusKm: { type: 'number' },
            count: { type: 'integer' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, propertyController.getNearbyProperties.bind(propertyController));

  // Update admin status only
  fastify.patch('/api/v1/properties/:id/admin-status', {
    schema: {
      description: 'Update property admin status',
      tags: ['Properties'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          adminStatus: { 
            type: 'string', 
            enum: ['ACTIVE', 'PENDING', 'INACTIVE'] 
          }
        },
        required: ['adminStatus']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                adminStatus: { type: 'string' }
              }
            },
            message: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: false },
            error: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: false },
            error: { type: 'string' }
          }
        }
      }
    }
  }, propertyController.updateAdminStatus.bind(propertyController));

  console.log('✅ Properties routes registered successfully');
}

/**
 * Plugin registration for Fastify
 */
export default async function propertiesPlugin(fastify: FastifyInstance) {
  console.log('🔧 Registering Properties routes...');
  await propertiesRoutes(fastify);
  console.log('✅ Properties routes registered successfully');
}
