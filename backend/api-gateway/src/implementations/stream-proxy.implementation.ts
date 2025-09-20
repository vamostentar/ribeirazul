import { DefaultMultipartStreamValidator } from '../implementations/multipart-validator.implementation.js';
import { DefaultStreamErrorHandler } from '../implementations/stream-error-handler.implementation.js';
import { MultipartStreamValidator, StreamErrorHandler, StreamProxy, StreamProxyConfig, StreamProxyHeaders, StreamProxyRequest, StreamProxyResponse } from '../interfaces/stream-proxy.interface.js';

/**
 * Stream Proxy Implementation
 * 
 * Implementação black box do proxy de streams.
 * Encapsula toda a complexidade de proxy sem expor detalhes internos.
 */
export class DefaultStreamProxy implements StreamProxy {
  private readonly multipartValidator: MultipartStreamValidator;
  private readonly errorHandler: StreamErrorHandler;

  constructor(
    multipartValidator?: MultipartStreamValidator,
    errorHandler?: StreamErrorHandler
  ) {
    this.multipartValidator = multipartValidator || new DefaultMultipartStreamValidator();
    this.errorHandler = errorHandler || new DefaultStreamErrorHandler();
  }

  /**
   * Proxy um request de stream para o serviço alvo
   */
  async proxyStream(
    request: StreamProxyRequest,
    config: StreamProxyConfig
  ): Promise<StreamProxyResponse> {
    try {
      // Validação prévia
      if (!this.canProxy(request)) {
        throw new Error('Request cannot be proxied');
      }

      // Validação específica para multipart
      if (this.isMultipartRequest(request)) {
        const validation = this.multipartValidator.validateUploadHeaders(request.headers);
        if (!validation.valid) {
          throw new Error(`Multipart validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Configuração dinâmica de timeout
      const dynamicTimeout = this.getDynamicTimeout(
        this.extractContentLength(request.headers)
      );

      // Headers otimizados para proxy
      const proxyHeaders = this.buildProxyHeaders(request.headers);

      // Configuração de fetch otimizada
      const fetchConfig = this.buildFetchConfig(request, proxyHeaders, dynamicTimeout);

      console.log(`📤 StreamProxy: Proxying ${request.method} to ${config.targetUrl}`, {
        timeout: dynamicTimeout,
        contentType: request.headers['content-type'],
        contentLength: request.headers['content-length'],
        hasBody: !!request.body
      });

      // Execução do proxy com retry
      return await this.executeProxyWithRetry(config.targetUrl, fetchConfig, config);

    } catch (error) {
      console.error('❌ StreamProxy: Proxy failed:', error);
      
      const proxyError = this.errorHandler.handleStreamError(
        error as Error,
        {
          requestUrl: request.url,
          targetUrl: config.targetUrl,
          method: request.method
        }
      );

      throw proxyError;
    }
  }

  /**
   * Valida se o request pode ser proxied
   */
  canProxy(request: StreamProxyRequest): boolean {
    // Verifica método HTTP válido
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    if (!validMethods.includes(request.method.toUpperCase())) {
      return false;
    }

    // Verifica URL válida
    if (!request.url || typeof request.url !== 'string') {
      return false;
    }

    // Verifica headers básicos
    if (!request.headers || typeof request.headers !== 'object') {
      return false;
    }

    return true;
  }

  /**
   * Obtém timeout dinâmico baseado no tamanho do conteúdo
   */
  getDynamicTimeout(contentLength?: number): number {
    const baseTimeout = 30000; // 30 segundos base
    const perMbTimeout = 10000; // 10 segundos por MB

    if (!contentLength) {
      return baseTimeout;
    }

    const sizeInMb = contentLength / (1024 * 1024);
    const dynamicTimeout = baseTimeout + (sizeInMb * perMbTimeout);

    // Limite máximo de 5 minutos
    return Math.min(dynamicTimeout, 300000);
  }

  /**
   * Verifica se é request multipart
   */
  private isMultipartRequest(request: StreamProxyRequest): boolean {
    const contentType = this.extractContentType(request.headers);
    return contentType ? contentType.includes('multipart') : false;
  }

  /**
   * Extrai Content-Type dos headers
   */
  private extractContentType(headers: StreamProxyHeaders): string | undefined {
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
   * Extrai Content-Length dos headers
   */
  private extractContentLength(headers: StreamProxyHeaders): number | undefined {
    const contentLength = headers['content-length'];
    
    if (typeof contentLength === 'string') {
      const length = parseInt(contentLength, 10);
      return isNaN(length) ? undefined : length;
    }
    
    if (Array.isArray(contentLength) && contentLength.length > 0) {
      const length = parseInt(contentLength[0] || '0', 10);
      return isNaN(length) ? undefined : length;
    }
    
    return undefined;
  }

  /**
   * Constrói headers otimizados para proxy
   */
  private buildProxyHeaders(headers: StreamProxyHeaders): Record<string, string> {
    const proxyHeaders: Record<string, string> = {};

    // Headers essenciais para proxy
    const essentialHeaders = [
      'content-type',
      'content-length',
      'authorization',
      'user-agent',
      'accept',
      'accept-encoding',
      'accept-language',
      'cache-control',
      'pragma',
      'referer',
      'x-requested-with',
      'x-forwarded-for',
      'x-forwarded-proto',
      'x-forwarded-host'
    ];

    essentialHeaders.forEach(headerName => {
      const headerValue = headers[headerName];
      if (headerValue) {
        if (typeof headerValue === 'string') {
          proxyHeaders[headerName] = headerValue;
        } else         if (Array.isArray(headerValue) && headerValue.length > 0) {
          proxyHeaders[headerName] = headerValue[0] || '';
        }
      }
    });

    // Adiciona headers de proxy
    proxyHeaders['x-forwarded-by'] = 'api-gateway';
    proxyHeaders['x-proxy-timestamp'] = new Date().toISOString();

    return proxyHeaders;
  }

  /**
   * Constrói configuração de fetch otimizada
   */
  private buildFetchConfig(
    request: StreamProxyRequest,
    headers: Record<string, string>,
    timeout: number
  ): RequestInit {
    const fetchConfig: RequestInit = {
      method: request.method,
      headers,
    };

    // Configuração do body baseada no tipo de conteúdo
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const contentType = this.extractContentType(request.headers);
      
      if (contentType && contentType.includes('multipart')) {
        // Para multipart, usa o stream raw
        (fetchConfig as any).body = request.rawRequest;
        (fetchConfig as any).duplex = 'half';
        console.log('📤 StreamProxy: Using raw stream for multipart');
      } else if (contentType && contentType.includes('application/json') && request.body) {
        // Para JSON, serializa o body
        fetchConfig.body = JSON.stringify(request.body);
      } else if (request.body) {
        // Para outros tipos, usa o stream
        (fetchConfig as any).body = request.body;
        (fetchConfig as any).duplex = 'half';
      }
    }

    // Configuração de timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    fetchConfig.signal = controller.signal;

    return fetchConfig;
  }

  /**
   * Executa proxy com retry automático
   */
  private async executeProxyWithRetry(
    targetUrl: string,
    fetchConfig: RequestInit,
    config: StreamProxyConfig
  ): Promise<StreamProxyResponse> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        if (process.env.ENABLE_DETAILED_LOGGING === 'true' || process.env.NODE_ENV !== 'production') {
          console.log(`📤 StreamProxy: Attempt ${attempt}/${config.maxRetries} to ${targetUrl}`);
        }
        
        const response = await fetch(targetUrl, fetchConfig);
        
        if (process.env.ENABLE_DETAILED_LOGGING === 'true' || process.env.NODE_ENV !== 'production') {
          console.log(`📥 StreamProxy: Response received`, {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type')
          });
        }

        return {
          statusCode: response.status,
          headers: this.convertResponseHeaders(response.headers),
          body: response.body as unknown as NodeJS.ReadableStream,
          success: response.ok
        };

      } catch (error) {
        lastError = error as Error;
        
        const proxyError = this.errorHandler.handleStreamError(
          lastError,
          {
            requestUrl: '',
            targetUrl,
            method: fetchConfig.method || 'UNKNOWN'
          }
        );

        console.error(`❌ StreamProxy: Attempt ${attempt} failed:`, {
          error: proxyError.message,
          retryable: proxyError.retryable,
          attempt
        });

        // Se não é retryable ou é a última tentativa, falha
        if (!proxyError.retryable || attempt === config.maxRetries) {
          throw proxyError;
        }

        // Aguarda antes da próxima tentativa
        const delay = this.errorHandler.getRetryDelay(proxyError, attempt);
        if (process.env.ENABLE_DETAILED_LOGGING === 'true' || process.env.NODE_ENV !== 'production') {
          console.log(`⏳ StreamProxy: Waiting ${delay}ms before retry`);
        }
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Proxy execution failed');
  }

  /**
   * Converte Headers do fetch para formato padrão
   */
  private convertResponseHeaders(headers: Headers): StreamProxyHeaders {
    const convertedHeaders: StreamProxyHeaders = {};
    
    headers.forEach((value, key) => {
      convertedHeaders[key] = value;
    });
    
    return convertedHeaders;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
