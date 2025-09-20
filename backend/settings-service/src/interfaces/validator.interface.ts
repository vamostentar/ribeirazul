import { UpdateSettingsRequest } from '@/types/settings';

/**
 * Interface para validação de configurações
 */
export interface SettingsValidator {
  validateSystemSettings(data: UpdateSettingsRequest): Promise<{ valid: boolean; errors: string[] }>;
  validateModuleSettings(moduleName: string, settings: Record<string, any>): Promise<{ valid: boolean; errors: string[] }>;
  validateColor(color: string): boolean;
  validateEmail(email: string): boolean;
  validatePhone(phone: string): boolean;
  validateUrl(url: string): boolean;
  validateJsonSchema(data: any, schema: any): Promise<{ valid: boolean; errors: string[] }>;
}

/**
 * Interface para serialização/deserialização
 */
export interface SettingsSerializer {
  serialize(settings: any): string;
  deserialize(data: string): any;
  serializeModuleSettings(settings: Record<string, any>): string;
  deserializeModuleSettings(data: string): Record<string, any>;
  validateSerializedData(data: string): boolean;
}
