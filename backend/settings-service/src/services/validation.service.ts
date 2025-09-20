import { ObservabilityManager } from '@/interfaces/observability.interface';
import { OperationResult } from '@/types/common';
import { RequestContext, UpdateSettingsRequest } from '@/types/settings';

export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'url' | 'color' | 'length' | 'range' | 'pattern';
  message: string;
  value?: any;
  min?: number;
  max?: number;
  pattern?: RegExp;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

export interface SEOValidationResult {
  title: {
    score: number;
    status: 'success' | 'warning' | 'error';
    message: string;
    length: number;
    maxLength: number;
  };
  description: {
    score: number;
    status: 'success' | 'warning' | 'error';
    message: string;
    length: number;
    maxLength: number;
  };
  keywords: {
    score: number;
    status: 'success' | 'warning' | 'error';
    message: string;
    count: number;
  };
  overallScore: number;
}

export class ValidationService {
  private _observability?: ObservabilityManager;

  constructor() {}

  set dependencies(deps: {
    observability: ObservabilityManager;
  }) {
    this._observability = deps.observability;
  }

  private get observability(): ObservabilityManager {
    if (!this._observability) {
      throw new Error('Observability dependency not set');
    }
    return this._observability;
  }

  /**
   * Valida configurações gerais do sistema
   */
  async validateSettings(
    settings: UpdateSettingsRequest,
    context?: RequestContext
  ): Promise<OperationResult<ValidationResult>> {
    const traceId = this.observability.startTrace('validate_settings');
    
    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      let score = 100;

      // Validações obrigatórias
      if (!settings.brandName || settings.brandName.trim().length === 0) {
        errors.push({
          field: 'brandName',
          message: 'Nome da marca é obrigatório',
          code: 'REQUIRED_FIELD',
          severity: 'error'
        });
        score -= 20;
      }

      if (!settings.contactEmail || settings.contactEmail.trim().length === 0) {
        errors.push({
          field: 'contactEmail',
          message: 'Email de contato é obrigatório',
          code: 'REQUIRED_FIELD',
          severity: 'error'
        });
        score -= 15;
      }

      // Validações de formato
      if (settings.contactEmail && !this.isValidEmail(settings.contactEmail)) {
        errors.push({
          field: 'contactEmail',
          message: 'Formato de email inválido',
          code: 'INVALID_FORMAT',
          severity: 'error'
        });
        score -= 10;
      }

      if (settings.logoUrl && !this.isValidUrl(settings.logoUrl)) {
        errors.push({
          field: 'logoUrl',
          message: 'URL do logo inválida',
          code: 'INVALID_FORMAT',
          severity: 'error'
        });
        score -= 5;
      }

      if (settings.faviconUrl && !this.isValidUrl(settings.faviconUrl)) {
        errors.push({
          field: 'faviconUrl',
          message: 'URL do favicon inválida',
          code: 'INVALID_FORMAT',
          severity: 'error'
        });
        score -= 5;
      }

      // Validações de cores
      const colorFields = ['primaryColor', 'secondaryColor', 'accentColor', 'backgroundColor', 'textColor'];
      colorFields.forEach(field => {
        const color = (settings as any)[field];
        if (color && !this.isValidColor(color)) {
          errors.push({
            field,
            message: 'Formato de cor inválido (use #RRGGBB)',
            code: 'INVALID_FORMAT',
            severity: 'error'
          });
          score -= 3;
        }
      });

      // Validações de comprimento
      if (settings.brandName && settings.brandName.length > 100) {
        warnings.push({
          field: 'brandName',
          message: 'Nome da marca muito longo',
          suggestion: 'Considere usar um nome mais curto para melhor usabilidade'
        });
        score -= 5;
      }

      if (settings.contactPhone && settings.contactPhone.length > 20) {
        warnings.push({
          field: 'contactPhone',
          message: 'Número de telefone muito longo',
          suggestion: 'Verifique se o formato está correto'
        });
        score -= 3;
      }

      // Validações de negócio
      if (settings.businessConfig) {
        const businessConfig = settings.businessConfig as any;
        
        if (businessConfig.maxFileSize && businessConfig.maxFileSize > 100 * 1024 * 1024) {
          warnings.push({
            field: 'businessConfig.maxFileSize',
            message: 'Tamanho máximo de arquivo muito alto',
            suggestion: 'Considere um limite menor para melhor performance'
          });
          score -= 5;
        }

        if (businessConfig.allowedFileTypes && Array.isArray(businessConfig.allowedFileTypes)) {
          const invalidTypes = businessConfig.allowedFileTypes.filter((type: string) => 
            !type.startsWith('image/') && !type.startsWith('application/') && !type.startsWith('text/')
          );
          
          if (invalidTypes.length > 0) {
            warnings.push({
              field: 'businessConfig.allowedFileTypes',
              message: 'Alguns tipos de arquivo podem não ser seguros',
              suggestion: 'Revise os tipos de arquivo permitidos'
            });
            score -= 3;
          }
        }
      }

      const result: ValidationResult = {
        valid: errors.length === 0,
        errors,
        warnings,
        score: Math.max(0, score)
      };

      this.observability.incrementCounter('settings_validation', { 
        errors: errors.length.toString(), 
        warnings: warnings.length.toString() 
      });
      this.observability.endTrace(traceId);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.observability.error('Erro ao validar configurações', { error, traceId });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Valida configurações SEO
   */
  async validateSEO(
    settings: UpdateSettingsRequest,
    context?: RequestContext
  ): Promise<OperationResult<SEOValidationResult>> {
    const traceId = this.observability.startTrace('validate_seo');
    
    try {
      const seoTitle = settings.seoTitle || '';
      const seoDescription = settings.seoDescription || '';
      const seoKeywords = settings.seoKeywords || '';

      // Validação do título
      const titleValidation = this.validateSEOTitle(seoTitle);
      
      // Validação da descrição
      const descriptionValidation = this.validateSEODescription(seoDescription);
      
      // Validação das palavras-chave
      const keywordsValidation = this.validateSEOKeywords(seoKeywords);

      const overallScore = Math.round((titleValidation.score + descriptionValidation.score + keywordsValidation.score) / 3);

      const result: SEOValidationResult = {
        title: titleValidation,
        description: descriptionValidation,
        keywords: keywordsValidation,
        overallScore
      };

      this.observability.incrementCounter('seo_validation', { 
        score: overallScore.toString() 
      });
      this.observability.endTrace(traceId);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.observability.error('Erro ao validar SEO', { error, traceId });
      this.observability.endTrace(traceId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  private validateSEOTitle(title: string) {
    const length = title.length;
    const maxLength = 60;
    
    if (length === 0) {
      return {
        score: 0,
        status: 'error' as const,
        message: 'Título obrigatório',
        length,
        maxLength
      };
    }
    
    if (length < 30) {
      return {
        score: 60,
        status: 'warning' as const,
        message: 'Muito curto (recomendado: 30-60 caracteres)',
        length,
        maxLength
      };
    }
    
    if (length > maxLength) {
      return {
        score: 40,
        status: 'warning' as const,
        message: 'Muito longo (máximo: 60 caracteres)',
        length,
        maxLength
      };
    }
    
    return {
      score: 100,
      status: 'success' as const,
      message: 'Tamanho ideal',
      length,
      maxLength
    };
  }

  private validateSEODescription(description: string) {
    const length = description.length;
    const maxLength = 160;
    
    if (length === 0) {
      return {
        score: 0,
        status: 'error' as const,
        message: 'Descrição obrigatória',
        length,
        maxLength
      };
    }
    
    if (length < 120) {
      return {
        score: 60,
        status: 'warning' as const,
        message: 'Muito curta (recomendado: 120-160 caracteres)',
        length,
        maxLength
      };
    }
    
    if (length > maxLength) {
      return {
        score: 40,
        status: 'warning' as const,
        message: 'Muito longa (máximo: 160 caracteres)',
        length,
        maxLength
      };
    }
    
    return {
      score: 100,
      status: 'success' as const,
      message: 'Tamanho ideal',
      length,
      maxLength
    };
  }

  private validateSEOKeywords(keywords: string) {
    const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
    const count = keywordList.length;
    
    if (count === 0) {
      return {
        score: 50,
        status: 'warning' as const,
        message: 'Nenhuma palavra-chave definida',
        count
      };
    }
    
    if (count > 10) {
      return {
        score: 60,
        status: 'warning' as const,
        message: 'Muitas palavras-chave (recomendado: 3-10)',
        count
      };
    }
    
    if (count < 3) {
      return {
        score: 70,
        status: 'warning' as const,
        message: 'Poucas palavras-chave (recomendado: 3-10)',
        count
      };
    }
    
    return {
      score: 100,
      status: 'success' as const,
      message: 'Quantidade ideal',
      count
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidColor(color: string): boolean {
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return colorRegex.test(color);
  }
}
