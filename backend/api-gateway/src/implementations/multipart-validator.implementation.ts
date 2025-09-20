import { MultipartStreamValidator } from '../interfaces/stream-proxy.interface.js';

/**
 * Multipart Stream Validator Implementation
 * 
 * Implementação black box do validador de streams multipart.
 * Encapsula toda a lógica de validação sem expor detalhes internos.
 */
export class DefaultMultipartStreamValidator implements MultipartStreamValidator {
  private readonly validContentTypes = [
    'multipart/form-data',
    'multipart/mixed',
    'multipart/alternative',
    'multipart/related'
  ];

  private readonly boundaryPattern = /boundary=([^;]+)/i;
  private readonly validBoundaryPattern = /^[a-zA-Z0-9'()+_,-.\/:=?]+$/;

  /**
   * Valida se o stream é um multipart válido
   */
  isValidMultipart(headers: any): boolean {
    const contentType = this.extractContentType(headers);
    
    if (!contentType) {
      return false;
    }

    // Verifica se é um tipo de conteúdo multipart válido
    const isMultipart = this.validContentTypes.some(validType => 
      contentType.toLowerCase().includes(validType.toLowerCase())
    );

    if (!isMultipart) {
      return false;
    }

    // Verifica se tem boundary válido
    return this.hasValidBoundary(contentType);
  }

  /**
   * Extrai boundary do Content-Type header
   */
  extractBoundary(contentType: string): string | undefined {
    if (!contentType) {
      return undefined;
    }

    const match = contentType.match(this.boundaryPattern);
    return match && match[1] ? match[1].trim() : undefined;
  }

  /**
   * Valida se o boundary está presente e é válido
   */
  hasValidBoundary(contentType: string): boolean {
    const boundary = this.extractBoundary(contentType);
    
    if (!boundary) {
      return false;
    }

    // Valida formato do boundary
    if (!this.validBoundaryPattern.test(boundary)) {
      return false;
    }

    // Valida comprimento do boundary (RFC 2046)
    if (boundary.length < 1 || boundary.length > 70) {
      return false;
    }

    return true;
  }

  /**
   * Extrai Content-Type dos headers
   */
  private extractContentType(headers: any): string | undefined {
    const contentType = headers['content-type'];
    
    if (typeof contentType === 'string') {
      return contentType;
    }
    
    if (Array.isArray(contentType) && contentType.length > 0) {
      return contentType[0];
    }
    
    return undefined;
  }

  /**
   * Valida headers específicos para uploads
   */
  validateUploadHeaders(headers: any): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Verifica Content-Type
    if (!this.isValidMultipart(headers)) {
      errors.push('Invalid or missing multipart Content-Type');
    }

    // Verifica Content-Length (opcional mas recomendado)
    const contentLength = headers['content-length'];
    if (contentLength) {
      const length = parseInt(contentLength as string, 10);
      if (isNaN(length) || length <= 0) {
        errors.push('Invalid Content-Length header');
      }
    }

    // Verifica Transfer-Encoding se presente
    const transferEncoding = headers['transfer-encoding'];
    if (transferEncoding && transferEncoding !== 'chunked') {
      errors.push('Unsupported Transfer-Encoding');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtém informações do boundary para logging
   */
  getBoundaryInfo(contentType: string): {
    boundary: string | undefined;
    isValid: boolean;
    length: number;
  } {
    const boundary = this.extractBoundary(contentType);
    const isValid = boundary ? this.hasValidBoundary(contentType) : false;
    
    return {
      boundary,
      isValid,
      length: boundary ? boundary.length : 0
    };
  }
}
