import { DefaultMultipartStreamValidator } from '../implementations/multipart-validator.implementation.js';
import { DefaultStreamErrorHandler } from '../implementations/stream-error-handler.implementation.js';
import { DefaultStreamProxy } from '../implementations/stream-proxy.implementation.js';
import { MultipartStreamValidator, StreamErrorHandler, StreamProxy } from '../interfaces/stream-proxy.interface.js';

/**
 * Stream Proxy Factory
 * 
 * Factory black box para criação de instâncias de StreamProxy.
 * Encapsula a criação de dependências e configurações.
 */
export class StreamProxyFactory {
  private static instance: StreamProxy | undefined;

  /**
   * Cria instância singleton do StreamProxy
   */
  static createInstance(): StreamProxy {
    if (!this.instance) {
      const multipartValidator = new DefaultMultipartStreamValidator();
      const errorHandler = new DefaultStreamErrorHandler();
      
      this.instance = new DefaultStreamProxy(multipartValidator, errorHandler);
    }
    
    return this.instance;
  }

  /**
   * Cria instância customizada do StreamProxy
   */
  static createCustomInstance(
    multipartValidator?: MultipartStreamValidator,
    errorHandler?: StreamErrorHandler
  ): StreamProxy {
    return new DefaultStreamProxy(multipartValidator, errorHandler);
  }

  /**
   * Cria instância para testes
   */
  static createTestInstance(
    multipartValidator?: MultipartStreamValidator,
    errorHandler?: StreamErrorHandler
  ): StreamProxy {
    return new DefaultStreamProxy(multipartValidator, errorHandler);
  }

  /**
   * Reseta instância singleton (útil para testes)
   */
  static resetInstance(): void {
    this.instance = undefined;
  }

  /**
   * Cria configuração padrão para proxy
   */
  static createDefaultConfig(targetUrl: string): {
    targetUrl: string;
    timeoutMs: number;
    maxRetries: number;
    retryDelayMs: number;
    bufferSize: number;
  } {
    return {
      targetUrl,
      timeoutMs: 30000, // 30 segundos base
      maxRetries: 3,
      retryDelayMs: 1000,
      bufferSize: 64 * 1024 // 64KB
    };
  }

  /**
   * Cria configuração otimizada para uploads grandes
   */
  static createUploadConfig(targetUrl: string): {
    targetUrl: string;
    timeoutMs: number;
    maxRetries: number;
    retryDelayMs: number;
    bufferSize: number;
  } {
    return {
      targetUrl,
      timeoutMs: 300000, // 5 minutos
      maxRetries: 2, // Menos retries para uploads grandes
      retryDelayMs: 2000, // Delay maior entre retries
      bufferSize: 256 * 1024 // 256KB para uploads
    };
  }

  /**
   * Cria configuração para testes
   */
  static createTestConfig(targetUrl: string): {
    targetUrl: string;
    timeoutMs: number;
    maxRetries: number;
    retryDelayMs: number;
    bufferSize: number;
  } {
    return {
      targetUrl,
      timeoutMs: 5000, // 5 segundos para testes
      maxRetries: 1, // Apenas 1 retry para testes
      retryDelayMs: 100,
      bufferSize: 1024 // 1KB para testes
    };
  }
}
