import { StreamErrorHandler, StreamProxyError } from '../interfaces/stream-proxy.interface.js';

/**
 * Stream Error Handler Implementation
 * 
 * Implementação black box do tratador de erros de stream.
 * Encapsula toda a lógica de tratamento de erros sem expor detalhes internos.
 */
export class DefaultStreamErrorHandler implements StreamErrorHandler {
  private readonly retryableErrorCodes = [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'EPIPE',
    'ECONNABORTED'
  ];

  private readonly retryableStatusCodes = [
    408, // Request Timeout
    429, // Too Many Requests
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
    507, // Insufficient Storage
    509  // Bandwidth Limit Exceeded
  ];

  /**
   * Trata erro de stream e retorna erro padronizado
   */
  handleStreamError(
    error: Error,
    context: {
      requestUrl: string;
      targetUrl: string;
      method: string;
    }
  ): StreamProxyError {
    // Erros de timeout
    if (this.isTimeoutError(error)) {
      return {
        code: 'TIMEOUT_ERROR',
        message: `Request timeout for ${context.method} ${context.requestUrl}`,
        statusCode: 408,
        retryable: true
      };
    }

    // Erros de conexão
    if (this.isConnectionError(error)) {
      return {
        code: 'CONNECTION_ERROR',
        message: `Connection failed to ${context.targetUrl}`,
        statusCode: 502,
        retryable: true
      };
    }

    // Erros de aborto
    if (this.isAbortError(error)) {
      return {
        code: 'REQUEST_ABORTED',
        message: `Request was aborted for ${context.requestUrl}`,
        statusCode: 499,
        retryable: false
      };
    }

    // Erros de stream
    if (this.isStreamError(error)) {
      return {
        code: 'STREAM_ERROR',
        message: `Stream processing failed: ${error.message}`,
        statusCode: 500,
        retryable: false
      };
    }

    // Erros de validação
    if (this.isValidationError(error)) {
      return {
        code: 'VALIDATION_ERROR',
        message: `Request validation failed: ${error.message}`,
        statusCode: 400,
        retryable: false
      };
    }

    // Erro genérico
    return {
      code: 'UNKNOWN_ERROR',
      message: `Unexpected error: ${error.message}`,
      statusCode: 500,
      retryable: this.isRetryableError(error)
    };
  }

  /**
   * Determina se um erro é retryable
   */
  isRetryableError(error: Error): boolean {
    // Verifica códigos de erro do sistema
    if (this.retryableErrorCodes.includes((error as any).code)) {
      return true;
    }

    // Verifica tipos específicos de erro
    if (this.isTimeoutError(error) || this.isConnectionError(error)) {
      return true;
    }

    // Verifica se é erro de fetch com status retryable
    if (this.isFetchError(error)) {
      const statusCode = this.extractStatusCode(error);
      return statusCode ? this.retryableStatusCodes.includes(statusCode) : false;
    }

    return false;
  }

  /**
   * Verifica se é erro de timeout
   */
  private isTimeoutError(error: Error): boolean {
    return error.name === 'AbortError' || 
           error.message.includes('timeout') ||
           error.message.includes('TIMEOUT') ||
           (error as any).code === 'ETIMEDOUT';
  }

  /**
   * Verifica se é erro de conexão
   */
  private isConnectionError(error: Error): boolean {
    const code = (error as any).code;
    return this.retryableErrorCodes.includes(code) ||
           error.message.includes('ECONNREFUSED') ||
           error.message.includes('ECONNRESET') ||
           error.message.includes('ENOTFOUND');
  }

  /**
   * Verifica se é erro de aborto
   */
  private isAbortError(error: Error): boolean {
    return error.name === 'AbortError' ||
           error.message.includes('aborted') ||
           error.message.includes('cancelled');
  }

  /**
   * Verifica se é erro de stream
   */
  private isStreamError(error: Error): boolean {
    return error.message.includes('stream') ||
           error.message.includes('pipe') ||
           error.message.includes('readable') ||
           error.message.includes('writable');
  }

  /**
   * Verifica se é erro de validação
   */
  private isValidationError(error: Error): boolean {
    return error.message.includes('validation') ||
           error.message.includes('invalid') ||
           error.message.includes('malformed') ||
           error.message.includes('boundary');
  }

  /**
   * Verifica se é erro de fetch
   */
  private isFetchError(error: Error): boolean {
    return error.message.includes('fetch') ||
           error.message.includes('HTTP') ||
           error.message.includes('status');
  }

  /**
   * Extrai status code de erro de fetch
   */
  private extractStatusCode(error: Error): number | undefined {
    const match = error.message.match(/status\s*(\d+)/i);
    return match && match[1] ? parseInt(match[1], 10) : undefined;
  }

  /**
   * Cria erro padronizado para logging
   */
  createLoggableError(error: StreamProxyError, context: any): {
    code: string;
    message: string;
    statusCode: number;
    retryable: boolean;
    context: any;
    timestamp: string;
  } {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode || 500,
      retryable: error.retryable,
      context,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Determina delay para retry baseado no tipo de erro
   */
  getRetryDelay(error: StreamProxyError, attempt: number): number {
    const baseDelay = 1000; // 1 segundo
    const maxDelay = 30000; // 30 segundos
    
    // Exponential backoff com jitter
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    const jitter = Math.random() * 0.1 * delay; // 10% jitter
    
    return Math.floor(delay + jitter);
  }
}
