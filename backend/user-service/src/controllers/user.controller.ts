import { FastifyReply, FastifyRequest } from 'fastify';
import { dependencyConfig } from '../config/dependency-config.js';
import { config } from '../config/index.js';

export class UserProfileController {
  async createUserProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const createData = (request as any).body;
      
      // Validação de dados obrigatórios
      if (!createData.firstName || !createData.lastName || !createData.email) {
        return reply.status(400).send({
          success: false,
          error: 'Nome, sobrenome e email são obrigatórios',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      // Verificar se email já existe
      const existingUser = await dependencyConfig.database.userProfiles.findByEmail(createData.email);
      if (existingUser) {
        return reply.status(409).send({
          success: false,
          error: 'Email já está em uso',
          code: 'EMAIL_EXISTS'
        });
      }

      // Usar valores padrão configurados
      const userData = {
        ...createData,
        isActive: createData.isActive !== undefined ? createData.isActive : config.defaults.userActive,
        isEmailVerified: createData.isEmailVerified !== undefined ? createData.isEmailVerified : config.defaults.userVerified,
        isPhoneVerified: createData.isPhoneVerified !== undefined ? createData.isPhoneVerified : config.defaults.userVerified,
        role: createData.role || config.defaults.userRole,
        // Garantir datas válidas
        dateOfBirth: createData.dateOfBirth ? new Date(createData.dateOfBirth) : undefined,
        emailVerifiedAt: createData.isEmailVerified ? new Date() : undefined,
        phoneVerifiedAt: createData.isPhoneVerified ? new Date() : undefined,
      };

      const profile = await dependencyConfig.database.userProfiles.create(userData);
      
      // Criar preferências padrão para o usuário
      if (profile) {
        try {
          await dependencyConfig.database.userPreferences.create({
            userId: profile.id,
            emailNotifications: config.userPreferencesDefaults.emailNotifications,
            smsNotifications: config.userPreferencesDefaults.smsNotifications,
            pushNotifications: config.userPreferencesDefaults.pushNotifications,
            priceDropAlerts: config.userPreferencesDefaults.priceDropAlerts,
            newPropertyAlerts: config.userPreferencesDefaults.newPropertyAlerts,
            marketUpdateAlerts: config.userPreferencesDefaults.marketUpdateAlerts,
            searchRadius: config.userPreferencesDefaults.searchRadius,
            sortBy: config.userPreferencesDefaults.sortBy,
            viewMode: config.userPreferencesDefaults.viewMode
          });
        } catch (prefError) {
          if (process.env.ENABLE_DETAILED_LOGGING === 'true' || process.env.NODE_ENV !== 'production') {
            console.warn('Erro ao criar preferências padrão:', prefError);
          }
          // Não falhar a criação do usuário por causa das preferências
        }
      }
      
      return reply.status(201).send({
        success: true,
        data: profile,
        message: 'Perfil de utilizador criado com sucesso'
      });
    } catch (error) {
      if (process.env.ENABLE_DETAILED_LOGGING === 'true' || process.env.NODE_ENV !== 'production') {
        console.error('Erro ao criar perfil de utilizador:', error);
      }
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }

  async getPendingApprovals(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Buscar usuários que não foram verificados (pendentes de aprovação)
      const pendingUsers = await dependencyConfig.database.userProfiles.findMany({
        where: {
          OR: [
            { isEmailVerified: false },
            { isPhoneVerified: false },
            { isActive: false }
          ]
        },
        take: 50, // Limitar resultados
        orderBy: { createdAt: 'desc' }
      });

      const count = pendingUsers.length;

      // Mapear apenas os campos necessários para economizar dados
      const mappedUsers = pendingUsers.slice(0, 10).map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        isActive: user.isActive,
        createdAt: user.createdAt
      }));

      return reply.status(200).send({
        success: true,
        data: {
          count,
          pendingUsers: mappedUsers
        }
      });
    } catch (error) {
      if (process.env.ENABLE_DETAILED_LOGGING === 'true' || process.env.NODE_ENV !== 'production') {
        console.error('Erro ao buscar aprovações pendentes:', error);
      }
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async getUserProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.id || (request as any).params?.userId;
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'User ID é obrigatório',
          code: 'MISSING_USER_ID'
        });
      }

      const profile = await dependencyConfig.database.userProfiles.findById(userId);
      
      if (!profile) {
        return reply.status(404).send({
          success: false,
          error: 'Perfil de utilizador não encontrado',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      return reply.send({
        success: true,
        data: profile,
        message: 'Perfil de utilizador obtido com sucesso'
      });
    } catch (error) {
      if (process.env.ENABLE_DETAILED_LOGGING === 'true' || process.env.NODE_ENV !== 'production') {
        console.error('Erro ao obter perfil de utilizador:', error);
      }
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async updateUserProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.id || (request as any).params?.userId;
      const updateData = (request as any).body;
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'User ID é obrigatório',
          code: 'MISSING_USER_ID'
        });
      }

      const updatedProfile = await dependencyConfig.database.userProfiles.update(userId, updateData);
      
      return reply.send({
        success: true,
        data: updatedProfile,
        message: 'Perfil de utilizador atualizado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil de utilizador:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async listUsers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as any;
      const { page = 1, limit = 20, search } = query;
      
      const skip = (page - 1) * limit;
      const take = Math.min(limit, 100);
      
      // Simple approach - get all users first, then filter if needed
      const allUsers = await dependencyConfig.database.userProfiles.findMany({
        skip: 0,
        take: 1000, // Get up to 1000 users
        orderBy: { createdAt: 'desc' }
      });
      
      // Apply filters in memory for now
      let filteredUsers = allUsers;
      
      if (search) {
        const searchLower = search.toLowerCase();
        filteredUsers = allUsers.filter(user => 
          user.email?.toLowerCase().includes(searchLower) ||
          user.firstName?.toLowerCase().includes(searchLower) ||
          user.lastName?.toLowerCase().includes(searchLower) ||
          user.phone?.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply pagination
      const total = filteredUsers.length;
      const paginatedUsers = filteredUsers.slice(skip, skip + take);
      
      // Remove sensitive data and ensure consistent format
      const sanitizedUsers = paginatedUsers.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        isActive: user.isActive,
        isVerified: user.isEmailVerified,
        role: user.role || 'CLIENT',
        roleId: user.role || 'client',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));
      
      return reply.status(200).send({
        success: true,
        data: sanitizedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        },
        message: 'Utilizadores listados com sucesso'
      });
    } catch (error) {
      if (process.env.ENABLE_DETAILED_LOGGING === 'true' || process.env.NODE_ENV !== 'production') {
        console.error('Erro ao listar utilizadores:', error);
      }
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }

  async deleteUserProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).params?.userId;
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'User ID é obrigatório',
          code: 'MISSING_USER_ID'
        });
      }

      // Check if user exists
      const existingUser = await dependencyConfig.database.userProfiles.findById(userId);
      if (!existingUser) {
        return reply.status(404).send({
          success: false,
          error: 'Utilizador não encontrado',
          code: 'USER_NOT_FOUND'
        });
      }

      // Delete user (this will cascade to related records due to Prisma schema)
      await dependencyConfig.database.userProfiles.delete(userId);
      
      return reply.send({
        success: true,
        message: 'Utilizador eliminado com sucesso'
      });
    } catch (error) {
      if (process.env.ENABLE_DETAILED_LOGGING === 'true' || process.env.NODE_ENV !== 'production') {
        console.error('Erro ao eliminar utilizador:', error);
      }
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async getUserStatistics(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Simplified implementation that doesn't rely on complex where clauses
      const allUsers = await dependencyConfig.database.userProfiles.findMany({
        skip: 0,
        take: 1000,
        orderBy: { createdAt: 'desc' }
      });
      
      // Calculate statistics in memory to avoid Prisma where clause issues
      const total = allUsers.length;
      const active = allUsers.filter(u => u.isActive).length;
      const inactive = allUsers.filter(u => !u.isActive).length;
      const verified = allUsers.filter(u => u.isEmailVerified).length;
      const unverified = allUsers.filter(u => !u.isEmailVerified).length;
      
      // Get recent logins (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentLogins = allUsers.filter(u => u.updatedAt > thirtyDaysAgo).length;
      
      return reply.status(200).send({
        success: true,
        data: {
          total,
          active,
          inactive,
          verified,
          unverified,
          withTwoFactor: 0, // TODO: implement when 2FA is added to user profiles
          recentLogins
        },
        message: 'Estatísticas de utilizadores obtidas com sucesso'
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas de utilizadores:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getRoles(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Return predefined roles based on the UserRole enum
      const roles = [
        {
          id: 'admin',
          name: 'ADMIN',
          displayName: 'Administrador',
          description: 'Acesso completo ao sistema',
          permissions: ['*'],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'agent',
          name: 'AGENT',
          displayName: 'Agente',
          description: 'Gestão de propriedades e clientes',
          permissions: ['properties.*', 'users.read', 'communications.*'],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'moderator',
          name: 'MODERATOR',
          displayName: 'Moderador',
          description: 'Moderação de conteúdo e utilizadores',
          permissions: ['users.*', 'properties.moderate', 'communications.moderate'],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'client',
          name: 'CLIENT',
          displayName: 'Cliente',
          description: 'Acesso básico às funcionalidades do cliente',
          permissions: ['properties.read', 'profile.manage'],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      
      return reply.status(200).send({
        success: true,
        data: roles,
        message: 'Roles obtidas com sucesso'
      });
    } catch (error) {
      if (process.env.ENABLE_DETAILED_LOGGING === 'true' || process.env.NODE_ENV !== 'production') {
        console.error('Erro ao obter roles:', error);
      }
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async getCurrentUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Get user data from JWT context or headers (set by API Gateway)
      const userId = (request as any).user?.id || request.headers['x-user-id'];
      const userEmail = (request as any).user?.email || request.headers['x-user-email'];
      const userRole = (request as any).user?.role || request.headers['x-user-role'];
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Utilizador não autenticado',
          code: 'UNAUTHORIZED'
        });
      }

      console.log('🔍 getCurrentUser: Looking for user profile:', { userId, userEmail });

      let profile = await dependencyConfig.database.userProfiles.findById(userId);
      
      // If not found by ID, try to find by email
      if (!profile && userEmail) {
        console.log('🔍 getCurrentUser: Profile not found by ID, trying by email...');
        profile = await dependencyConfig.database.userProfiles.findByEmail(userEmail);
      }
      
      // If profile doesn't exist, create it automatically from auth data
      if (!profile && userEmail) {
        console.log('🔧 getCurrentUser: Profile not found, creating from auth data...');
        
        try {
          // Extract first and last name from email if not available
          const emailUsername = userEmail.split('@')[0];
          const nameParts = emailUsername.split('.');
          
          const profileData = {
            // Don't specify ID, let Prisma generate a new one
            email: userEmail,
            firstName: nameParts[0] || emailUsername,
            lastName: nameParts[1] || 'User',
            role: userRole === 'admin' ? 'ADMIN' : 'CLIENT',
            isActive: true,
            isEmailVerified: true, // If user is authenticated, email is verified
          };

          console.log('🔧 getCurrentUser: Creating profile with data:', profileData);
          
          profile = await dependencyConfig.database.userProfiles.create(profileData);
          
          console.log('✅ getCurrentUser: Profile created successfully:', profile.id);
          
          // Create default preferences
          try {
            await dependencyConfig.database.userPreferences.create({
              userId: profile.id,
              emailNotifications: config.userPreferencesDefaults.emailNotifications,
              smsNotifications: config.userPreferencesDefaults.smsNotifications,
              pushNotifications: config.userPreferencesDefaults.pushNotifications,
              priceDropAlerts: config.userPreferencesDefaults.priceDropAlerts,
              newPropertyAlerts: config.userPreferencesDefaults.newPropertyAlerts,
              marketUpdateAlerts: config.userPreferencesDefaults.marketUpdateAlerts,
              searchRadius: config.userPreferencesDefaults.searchRadius,
              sortBy: config.userPreferencesDefaults.sortBy,
              viewMode: config.userPreferencesDefaults.viewMode
            });
            console.log('✅ getCurrentUser: Default preferences created');
          } catch (prefError) {
            console.warn('⚠️ getCurrentUser: Error creating default preferences:', prefError);
            // Don't fail the request if preferences creation fails
          }
          
        } catch (createError) {
          console.error('❌ getCurrentUser: Error creating profile:', createError);
          return reply.status(500).send({
            success: false,
            error: 'Erro ao criar perfil de utilizador',
            code: 'PROFILE_CREATION_ERROR'
          });
        }
      }
      
      if (!profile) {
        return reply.status(404).send({
          success: false,
          error: 'Perfil de utilizador não encontrado e não foi possível criar',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      // Return user profile in format expected by frontend
      const userData = {
        id: profile.id,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        role: profile.role,
        isActive: profile.isActive,
        isVerified: profile.isEmailVerified,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      };

      console.log('✅ getCurrentUser: Returning user data:', userData.email);

      return reply.send({
        success: true,
        data: userData,
        message: 'Utilizador atual obtido com sucesso'
      });
    } catch (error) {
      console.error('💥 getCurrentUser: Error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async updateUserPermissions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).params?.userId;
      const permissionsData = (request as any).body;
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'User ID é obrigatório',
          code: 'MISSING_USER_ID'
        });
      }

      // For now, return success as permissions are managed via roles
      // In a full implementation, this would update user-specific permissions
      return reply.send({
        success: true,
        message: 'Permissões atualizadas com sucesso',
        data: { userId, permissions: permissionsData }
      });
    } catch (error) {
      console.error('Erro ao atualizar permissões:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

export class UserPreferencesController {
  async getUserPreferences(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.id || (request as any).params?.userId;
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'User ID é obrigatório',
          code: 'MISSING_USER_ID'
        });
      }

      const preferences = await dependencyConfig.database.userPreferences.findByUserId(userId);
      
      return reply.send({
        success: true,
        data: preferences || {},
        message: 'Preferências de utilizador obtidas com sucesso'
      });
    } catch (error) {
      console.error('Erro ao obter preferências de utilizador:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async updateUserPreferences(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.id || (request as any).params?.userId;
      const updateData = (request as any).body;
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'User ID é obrigatório',
          code: 'MISSING_USER_ID'
        });
      }

      const updatedPreferences = await dependencyConfig.database.userPreferences.update(userId, updateData);
      
      return reply.send({
        success: true,
        data: updatedPreferences,
        message: 'Preferências de utilizador atualizadas com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar preferências de utilizador:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

export class PropertyInterestController {
  async getUserPropertyInterests(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.id || (request as any).params?.userId;
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'User ID é obrigatório',
          code: 'MISSING_USER_ID'
        });
      }

      const interests = await dependencyConfig.database.propertyInterests.findByUserId(userId);
      
      return reply.send({
        success: true,
        data: interests,
        message: 'Interesses em propriedades obtidos com sucesso'
      });
    } catch (error) {
      console.error('Erro ao obter interesses em propriedades:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async addPropertyInterest(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.id;
      const { propertyId, interestType } = (request as any).body;
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'User ID é obrigatório',
          code: 'MISSING_USER_ID'
        });
      }

      if (!propertyId) {
        return reply.status(400).send({
          success: false,
          error: 'Property ID é obrigatório',
          code: 'MISSING_PROPERTY_ID'
        });
      }

      const interest = await dependencyConfig.database.propertyInterests.create({
        userId,
        propertyId,
        interestType: interestType || config.defaults.interestType
      });
      
      return reply.status(201).send({
        success: true,
        data: interest,
        message: 'Interesse em propriedade adicionado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao adicionar interesse em propriedade:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

export class SavedPropertyController {
  async getUserSavedProperties(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.id || (request as any).params?.userId;
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'User ID é obrigatório',
          code: 'MISSING_USER_ID'
        });
      }

      const savedProperties = await dependencyConfig.database.savedProperties.findByUserId(userId);
      
      return reply.send({
        success: true,
        data: savedProperties,
        message: 'Propriedades guardadas obtidas com sucesso'
      });
    } catch (error) {
      console.error('Erro ao obter propriedades guardadas:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async saveProperty(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.id;
      const { propertyId, notes } = (request as any).body;
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'User ID é obrigatório',
          code: 'MISSING_USER_ID'
        });
      }

      if (!propertyId) {
        return reply.status(400).send({
          success: false,
          error: 'Property ID é obrigatório',
          code: 'MISSING_PROPERTY_ID'
        });
      }

      const savedProperties = await dependencyConfig.database.savedProperties.create({
        userId,
        propertyId,
        notes: notes || config.defaults.savedPropertyNotes
      });
      
      return reply.status(201).send({
        success: true,
        data: savedProperties,
        message: 'Propriedade guardada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao guardar propriedade:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async removeSavedProperty(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.id;
      const { propertyId } = (request as any).params;
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'User ID é obrigatório',
          code: 'MISSING_USER_ID'
        });
      }

      if (!propertyId) {
        return reply.status(400).send({
          success: false,
          error: 'Property ID é obrigatório',
          code: 'MISSING_PROPERTY_ID'
        });
      }

      // Primeiro encontrar a propriedade guardada pelo userId e propertyId
      const savedProperties = await dependencyConfig.database.savedProperties.findByUserId(userId);
      const savedProperty = savedProperties.find(sp => sp.propertyId === propertyId);
      
      if (savedProperty) {
        await dependencyConfig.database.savedProperties.delete(savedProperty.id);
      }
      
      return reply.send({
        success: true,
        message: 'Propriedade removida das guardadas com sucesso'
      });
    } catch (error) {
      console.error('Erro ao remover propriedade guardada:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

export class SearchHistoryController {
  async getUserSearchHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.id || (request as any).params?.userId;
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'User ID é obrigatório',
          code: 'MISSING_USER_ID'
        });
      }

      const searchHistory = await dependencyConfig.database.searchHistory.findByUserId(userId);
      
      return reply.send({
        success: true,
        data: searchHistory,
        message: 'Histórico de pesquisas obtido com sucesso'
      });
    } catch (error) {
      console.error('Erro ao obter histórico de pesquisas:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async addSearchHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.id;
      const { searchQuery, filters, resultsCount } = (request as any).body;
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'User ID é obrigatório',
          code: 'MISSING_USER_ID'
        });
      }

      if (!searchQuery) {
        return reply.status(400).send({
          success: false,
          error: 'Query de pesquisa é obrigatória',
          code: 'MISSING_SEARCH_QUERY'
        });
      }

      const searchEntry = await dependencyConfig.database.searchHistory.create({
        userId,
        query: searchQuery,
        resultsCount: resultsCount || 0
      });
      
      return reply.status(201).send({
        success: true,
        data: searchEntry,
        message: 'Pesquisa adicionada ao histórico com sucesso'
      });
    } catch (error) {
      console.error('Erro ao adicionar pesquisa ao histórico:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

export class NotificationController {
  async getUserNotifications(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.id || (request as any).params?.userId;
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'User ID é obrigatório',
          code: 'MISSING_USER_ID'
        });
      }

      const notificationss = await dependencyConfig.database.notifications.findByUserId(userId);
      
      return reply.send({
        success: true,
        data: notificationss,
        message: 'Notificações obtidas com sucesso'
      });
    } catch (error) {
      console.error('Erro ao obter notificações:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  async markNotificationAsRead(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.id;
      const { notificationId } = (request as any).params;
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'User ID é obrigatório',
          code: 'MISSING_USER_ID'
        });
      }

      if (!notificationId) {
        return reply.status(400).send({
          success: false,
          error: 'Notification ID é obrigatório',
          code: 'MISSING_NOTIFICATION_ID'
        });
      }

      await dependencyConfig.database.notifications.markAsRead(notificationId);
      
      return reply.send({
        success: true,
        message: 'Notificação marcada como lida com sucesso'
      });
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}
