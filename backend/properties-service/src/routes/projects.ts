import { FastifyInstance } from 'fastify';

// Mock projects data - in production, this would come from database
const mockProjects: Array<{
  id: string;
  name: string;
  type: 'renovation' | 'construction' | 'design';
  description: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}> = [
  {
    id: '1',
    name: 'Residencial Vista Verde',
    type: 'construction',
    description: 'Condomínio residencial com vista para o rio, próximo ao centro da cidade. Apartamentos de 2 e 3 quartos com acabamentos premium.',
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    name: 'Reforma Casa Colonial',
    type: 'renovation',
    description: 'Restauração completa de casa histórica mantendo características originais com modernização dos ambientes.',
    imageUrl: 'https://images.unsplash.com/photo-1503387837-b154d5074bd2?auto=format&fit=crop&w=800&q=80',
    createdAt: '2024-01-20T14:30:00Z',
    updatedAt: '2024-01-20T14:30:00Z'
  },
  {
    id: '3',
    name: 'Edifício Empresarial Center',
    type: 'construction',
    description: 'Edifício comercial de 15 andares com salas comerciais, auditórios e áreas de convivência.',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    createdAt: '2024-02-01T09:15:00Z',
    updatedAt: '2024-02-01T09:15:00Z'
  },
  {
    id: '4',
    name: 'Design Interiores Loft Moderno',
    type: 'design',
    description: 'Projeto de arquitetura de interiores para loft industrial com conceito moderno e minimalista.',
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
    createdAt: '2024-02-10T16:45:00Z',
    updatedAt: '2024-02-10T16:45:00Z'
  }
];

export async function projectsRoutes(fastify: FastifyInstance) {
  // Get all projects
  fastify.get('/api/v1/projects', async (request, reply) => {
    const { type, limit = '10' } = request.query as { type?: string; limit?: string };

    let projects = [...mockProjects];

    // Filter by type if provided
    if (type) {
      projects = projects.filter(project => project.type === type);
    }

    // Apply limit
    const limitNum = parseInt(limit, 10) || 10;
    projects = projects.slice(0, limitNum);

    return reply.send({
      success: true,
      data: projects,
      meta: {
        total: projects.length,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  });

  // Get single project by ID
  fastify.get('/api/v1/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const project = mockProjects.find(p => p.id === id);

    if (!project) {
      return reply.code(404).send({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND',
        message: `No project found with ID: ${id}`,
        timestamp: new Date().toISOString()
      });
    }

    return reply.send({
      success: true,
      data: project,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  });

  // Create new project (protected route - would need authentication)
  fastify.post('/api/v1/projects', async (request, reply) => {
    const { name, type, description, imageUrl } = request.body as {
      name: string;
      type: 'renovation' | 'construction' | 'design';
      description?: string;
      imageUrl?: string;
    };

    if (!name || !type) {
      return reply.code(400).send({
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        message: 'Name and type are required',
        timestamp: new Date().toISOString()
      });
    }

    const newProject = {
      id: (mockProjects.length + 1).toString(),
      name,
      type,
      description: description || '',
      imageUrl: imageUrl || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockProjects.push(newProject);

    return reply.code(201).send({
      success: true,
      data: newProject,
      message: 'Project created successfully',
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  });

  // Update project (protected route - would need authentication)
  fastify.put('/api/v1/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as Partial<{
      name: string;
      type: 'renovation' | 'construction' | 'design';
      description: string;
      imageUrl: string;
    }>;

    const projectIndex = mockProjects.findIndex(p => p.id === id);

    if (projectIndex === -1) {
      return reply.code(404).send({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND',
        message: `No project found with ID: ${id}`,
        timestamp: new Date().toISOString()
      });
    }

    mockProjects[projectIndex] = {
      ...mockProjects[projectIndex],
      name: updates.name ?? mockProjects[projectIndex].name,
      type: updates.type ?? mockProjects[projectIndex].type,
      description: updates.description ?? mockProjects[projectIndex].description,
      imageUrl: updates.imageUrl ?? mockProjects[projectIndex].imageUrl,
      updatedAt: new Date().toISOString()
    };

    return reply.send({
      success: true,
      data: mockProjects[projectIndex],
      message: 'Project updated successfully',
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  });

  // Delete project (protected route - would need authentication)
  fastify.delete('/api/v1/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const projectIndex = mockProjects.findIndex(p => p.id === id);

    if (projectIndex === -1) {
      return reply.code(404).send({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND',
        message: `No project found with ID: ${id}`,
        timestamp: new Date().toISOString()
      });
    }

    const deletedProject = mockProjects.splice(projectIndex, 1)[0];

    return reply.send({
      success: true,
      data: deletedProject,
      message: 'Project deleted successfully',
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  });
}
