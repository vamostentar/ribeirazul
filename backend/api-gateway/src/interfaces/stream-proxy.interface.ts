/**
 * Stream Proxy Interface - Black Box Contract
 * 
 * Esta interface define o contrato para proxies de stream sem expor
 * detalhes de implementação. Permite substituição completa da implementação
 * sem afetar o código cliente.
 */

export interface StreamProxyConfig {
  readonly targetUrl: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly retryDelayMs: number;
  readonly bufferSize: number;
}

export interface StreamProxyHeaders {
  [key: string]: string | string[] | undefined;
}

export interface StreamProxyRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: StreamProxyHeaders;
  readonly body?: NodeJS.ReadableStream;
  readonly rawRequest?: any;
}

export interface StreamProxyResponse {
  readonly statusCode: number;
  readonly headers: StreamProxyHeaders;
  readonly body: NodeJS.ReadableStream;
  readonly success: boolean;
}

export interface StreamProxyError {
  readonly code: string;
  readonly message: string;
  readonly statusCode?: number;
  readonly retryable: boolean;
}

/**
 * Stream Proxy Interface
 * 
 * Black box que encapsula toda a complexidade de proxy de streams.
 * O cliente não precisa saber como funciona internamente.
 */
export interface StreamProxy {
  /**
   * Proxy um request de stream para o serviço alvo
   * @param request - Request a ser proxied
   * @param config - Configuração do proxy
   * @returns Promise com a resposta do serviço alvo
   */
  proxyStream(
    request: StreamProxyRequest,
    config: StreamProxyConfig
  ): Promise<StreamProxyResponse>;

  /**
   * Valida se o request pode ser proxied
   * @param request - Request a ser validado
   * @returns true se pode ser proxied, false caso contrário
   */
  canProxy(request: StreamProxyRequest): boolean;

  /**
   * Obtém timeout dinâmico baseado no tamanho do conteúdo
   * @param contentLength - Tamanho do conteúdo em bytes
   * @returns Timeout em milissegundos
   */
  getDynamicTimeout(contentLength?: number): number;
}

/**
 * Multipart Stream Validator Interface
 * 
 * Black box para validação de streams multipart
 */
export interface MultipartStreamValidator {
  /**
   * Valida se o stream é um multipart válido
   * @param headers - Headers do request
   * @returns true se é multipart válido
   */
  isValidMultipart(headers: StreamProxyHeaders): boolean;

  /**
   * Extrai boundary do Content-Type header
   * @param contentType - Content-Type header
   * @returns boundary string ou undefined
   */
  extractBoundary(contentType: string): string | undefined;

  /**
   * Valida se o boundary está presente e é válido
   * @param contentType - Content-Type header
   * @returns true se boundary é válido
   */
  hasValidBoundary(contentType: string): boolean;

  /**
   * Valida headers específicos para uploads
   * @param headers - Headers do request
   * @returns resultado da validação com erros
   */
  validateUploadHeaders(headers: StreamProxyHeaders): {
    valid: boolean;
    errors: string[];
  };
}

/**
 * Stream Error Handler Interface
 * 
 * Black box para tratamento de erros de stream
 */
export interface StreamErrorHandler {
  /**
   * Trata erro de stream e retorna erro padronizado
   * @param error - Erro original
   * @param context - Contexto do erro
   * @returns Erro padronizado
   */
  handleStreamError(
    error: Error,
    context: {
      requestUrl: string;
      targetUrl: string;
      method: string;
    }
  ): StreamProxyError;

  /**
   * Determina se um erro é retryable
   * @param error - Erro a ser analisado
   * @returns true se pode ser retentado
   */
  isRetryableError(error: Error): boolean;

  /**
   * Determina delay para retry baseado no tipo de erro
   * @param error - Erro a ser analisado
   * @param attempt - Número da tentativa atual
   * @returns Delay em milissegundos
   */
  getRetryDelay(error: StreamProxyError, attempt: number): number;
}
