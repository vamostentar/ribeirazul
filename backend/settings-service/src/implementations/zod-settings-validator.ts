import { SettingsValidator } from '@/interfaces/validator.interface';
import { UpdateSettingsRequest } from '@/types/settings';
import { z } from 'zod';

/**
 * Implementação do validador usando Zod
 */
export class ZodSettingsValidator implements SettingsValidator {
  private colorSchema = z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Cor deve ser um código hexadecimal válido');
  private emailSchema = z.string().email('Email inválido');
  private phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Telefone inválido');
  private urlSchema = z.string().url('URL inválida');

  private systemSettingsSchema = z.object({
    brandName: z.string().min(2, 'Nome da marca deve ter pelo menos 2 caracteres').max(100, 'Nome da marca muito longo').optional(),
    logoUrl: this.urlSchema.optional(),
    faviconUrl: this.urlSchema.optional(),
    primaryColor: this.colorSchema.optional(),
    secondaryColor: this.colorSchema.optional(),
    accentColor: this.colorSchema.optional(),
    backgroundColor: this.colorSchema.optional(),
    textColor: this.colorSchema.optional(),
    contactEmail: this.emailSchema.optional(),
    contactPhone: this.phoneSchema.optional(),
    contactAddress: z.string().max(500, 'Endereço muito longo').optional(),
    socialLinks: z.object({
      facebook: this.urlSchema.optional(),
      instagram: this.urlSchema.optional(),
      linkedin: this.urlSchema.optional(),
      twitter: this.urlSchema.optional(),
      youtube: this.urlSchema.optional(),
      whatsapp: this.urlSchema.optional(),
    }).optional(),
    businessHours: z.object({
      monday: z.string().optional(),
      tuesday: z.string().optional(),
      wednesday: z.string().optional(),
      thursday: z.string().optional(),
      friday: z.string().optional(),
      saturday: z.string().optional(),
      sunday: z.string().optional(),
    }).optional(),
    businessConfig: z.object({
      currency: z.string().length(3, 'Moeda deve ter 3 caracteres').optional(),
      timezone: z.string().optional(),
      language: z.string().optional(),
      dateFormat: z.string().optional(),
      timeFormat: z.enum(['12h', '24h']).optional(),
      maxFileSize: z.number().min(1024, 'Tamanho máximo deve ser pelo menos 1KB').optional(),
      allowedFileTypes: z.array(z.string()).optional(),
    }).optional(),
    seoTitle: z.string().max(60, 'Título SEO muito longo').optional(),
    seoDescription: z.string().max(160, 'Descrição SEO muito longa').optional(),
    seoKeywords: z.string().max(200, 'Palavras-chave SEO muito longas').optional(),
    maintenanceMode: z.boolean().optional(),
    maintenanceMessage: z.string().max(500, 'Mensagem de manutenção muito longa').optional(),
  });

  private moduleSchemas: Record<string, z.ZodSchema> = {
    auth: z.object({
      maxLoginAttempts: z.number().min(1, 'Máximo de tentativas deve ser pelo menos 1').max(10, 'Máximo de tentativas muito alto').optional(),
      lockoutDuration: z.number().min(60, 'Duração do bloqueio deve ser pelo menos 1 minuto').max(3600, 'Duração do bloqueio muito longa').optional(),
      sessionTimeout: z.number().min(300, 'Timeout de sessão deve ser pelo menos 5 minutos').max(86400, 'Timeout de sessão muito longo').optional(),
      enableTwoFactor: z.boolean().optional(),
      passwordMinLength: z.number().min(8, 'Senha deve ter pelo menos 8 caracteres').max(128, 'Senha muito longa').optional(),
      passwordRequireSpecial: z.boolean().optional(),
      passwordRequireNumbers: z.boolean().optional(),
      passwordRequireUppercase: z.boolean().optional(),
    }),
    media: z.object({
      maxFileSize: z.number().min(1024, 'Tamanho máximo deve ser pelo menos 1KB').max(104857600, 'Tamanho máximo muito grande (100MB)').optional(),
      allowedFileTypes: z.array(z.string()).min(1, 'Deve ter pelo menos um tipo de arquivo permitido').optional(),
      enableImageCompression: z.boolean().optional(),
      imageQuality: z.number().min(0.1, 'Qualidade deve ser pelo menos 0.1').max(1, 'Qualidade deve ser no máximo 1').optional(),
      enableThumbnails: z.boolean().optional(),
      thumbnailSizes: z.array(z.number()).optional(),
    }),
    properties: z.object({
      maxPropertiesPerPage: z.number().min(1, 'Máximo de propriedades por página deve ser pelo menos 1').max(100, 'Máximo muito alto').optional(),
      defaultPropertiesPerPage: z.number().min(1, 'Padrão deve ser pelo menos 1').max(50, 'Padrão muito alto').optional(),
      maxPrice: z.number().min(0, 'Preço máximo deve ser positivo').optional(),
      maxTitleLength: z.number().min(10, 'Título deve ter pelo menos 10 caracteres').max(200, 'Título muito longo').optional(),
      maxDescriptionLength: z.number().min(50, 'Descrição deve ter pelo menos 50 caracteres').max(2000, 'Descrição muito longa').optional(),
      enableGeolocation: z.boolean().optional(),
      enableVirtualTour: z.boolean().optional(),
    }),
    notifications: z.object({
      enableEmailNotifications: z.boolean().optional(),
      enableSmsNotifications: z.boolean().optional(),
      enablePushNotifications: z.boolean().optional(),
      emailFromAddress: this.emailSchema.optional(),
      smsProvider: z.string().optional(),
      pushNotificationKey: z.string().optional(),
    }),
  };

  async validateSystemSettings(data: UpdateSettingsRequest): Promise<{ valid: boolean; errors: string[] }> {
    try {
      this.systemSettingsSchema.parse(data);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        };
      }
      return {
        valid: false,
        errors: ['Erro desconhecido na validação'],
      };
    }
  }

  async validateModuleSettings(moduleName: string, settings: Record<string, any>): Promise<{ valid: boolean; errors: string[] }> {
    const schema = this.moduleSchemas[moduleName];
    
    if (!schema) {
      return {
        valid: false,
        errors: [`Módulo '${moduleName}' não possui schema de validação`],
      };
    }

    try {
      schema.parse(settings);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        };
      }
      return {
        valid: false,
        errors: ['Erro desconhecido na validação'],
      };
    }
  }

  validateColor(color: string): boolean {
    return this.colorSchema.safeParse(color).success;
  }

  validateEmail(email: string): boolean {
    return this.emailSchema.safeParse(email).success;
  }

  validatePhone(phone: string): boolean {
    return this.phoneSchema.safeParse(phone).success;
  }

  validateUrl(url: string): boolean {
    return this.urlSchema.safeParse(url).success;
  }

  async validateJsonSchema(data: any, schema: any): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const zodSchema = z.object(schema);
      zodSchema.parse(data);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        };
      }
      return {
        valid: false,
        errors: ['Erro desconhecido na validação'],
      };
    }
  }

  /**
   * Validações específicas de negócio
   */
  validateBusinessHours(hours: Record<string, string>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s*-\s*([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    for (const day of days) {
      const time = hours[day];
      if (time && time.toLowerCase() !== 'fechado' && !timeRegex.test(time)) {
        errors.push(`Horário inválido para ${day}: ${time}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateSocialLinks(links: Record<string, string>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const validPlatforms = ['facebook', 'instagram', 'linkedin', 'twitter', 'youtube', 'whatsapp'];

    for (const [platform, url] of Object.entries(links)) {
      if (!validPlatforms.includes(platform)) {
        errors.push(`Plataforma social inválida: ${platform}`);
      }
      
      if (url && !this.validateUrl(url)) {
        errors.push(`URL inválida para ${platform}: ${url}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateFileTypes(fileTypes: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const validTypes = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx'];

    for (const type of fileTypes) {
      if (!validTypes.includes(type.toLowerCase())) {
        errors.push(`Tipo de arquivo não suportado: ${type}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
