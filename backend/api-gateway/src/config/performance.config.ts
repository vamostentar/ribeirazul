/**
 * Performance Configuration Module
 * 
 * Black box para configurações de performance do proxy de streams.
 * Encapsula todas as configurações relacionadas com performance sem expor detalhes internos.
 */

export interface PerformanceConfig {
  readonly baseTimeout: number;
  readonly timeoutPerMb: number;
  readonly maxTimeout: number;
  readonly maxRetries: number;
  readonly baseRetryDelay: number;
  readonly maxRetryDelay: number;
  readonly bufferSize: number;
  readonly maxConcurrentRequests: number;
  readonly connectionTimeout: number;
  readonly keepAliveTimeout: number;
}

export interface UploadOptimizationConfig {
  readonly chunkSize: number;
  readonly parallelUploads: number;
  readonly compressionThreshold: number;
  readonly progressReportingInterval: number;
  readonly resumableUploadThreshold: number;
}

/**
 * Performance Configuration Factory
 * 
 * Factory black box para criação de configurações de performance otimizadas.
 */
export class PerformanceConfigFactory {
  /**
   * Configuração padrão para requests normais
   */
  static createDefaultConfig(): PerformanceConfig {
    return {
      baseTimeout: 30000, // 30 segundos
      timeoutPerMb: 10000, // 10 segundos por MB
      maxTimeout: 300000, // 5 minutos máximo
      maxRetries: 3,
      baseRetryDelay: 1000, // 1 segundo
      maxRetryDelay: 30000, // 30 segundos máximo
      bufferSize: 64 * 1024, // 64KB
      maxConcurrentRequests: 10,
      connectionTimeout: 10000, // 10 segundos
      keepAliveTimeout: 60000 // 1 minuto
    };
  }

  /**
   * Configuração otimizada para uploads grandes
   */
  static createUploadConfig(): PerformanceConfig {
    return {
      baseTimeout: 60000, // 1 minuto base
      timeoutPerMb: 15000, // 15 segundos por MB
      maxTimeout: 600000, // 10 minutos máximo
      maxRetries: 2, // Menos retries para uploads grandes
      baseRetryDelay: 2000, // 2 segundos
      maxRetryDelay: 60000, // 1 minuto máximo
      bufferSize: 256 * 1024, // 256KB para uploads
      maxConcurrentRequests: 5, // Menos concorrência para uploads
      connectionTimeout: 30000, // 30 segundos
      keepAliveTimeout: 120000 // 2 minutos
    };
  }

  /**
   * Configuração para testes de performance
   */
  static createTestConfig(): PerformanceConfig {
    return {
      baseTimeout: 5000, // 5 segundos
      timeoutPerMb: 1000, // 1 segundo por MB
      maxTimeout: 30000, // 30 segundos máximo
      maxRetries: 1,
      baseRetryDelay: 100,
      maxRetryDelay: 1000,
      bufferSize: 1024, // 1KB
      maxConcurrentRequests: 2,
      connectionTimeout: 2000,
      keepAliveTimeout: 5000
    };
  }

  /**
   * Configuração otimizada para alta carga
   */
  static createHighLoadConfig(): PerformanceConfig {
    return {
      baseTimeout: 20000, // 20 segundos
      timeoutPerMb: 5000, // 5 segundos por MB
      maxTimeout: 180000, // 3 minutos máximo
      maxRetries: 2,
      baseRetryDelay: 500,
      maxRetryDelay: 10000,
      bufferSize: 128 * 1024, // 128KB
      maxConcurrentRequests: 20, // Mais concorrência
      connectionTimeout: 5000,
      keepAliveTimeout: 30000
    };
  }

  /**
   * Configuração para uploads otimizados
   */
  static createUploadOptimizationConfig(): UploadOptimizationConfig {
    return {
      chunkSize: 1024 * 1024, // 1MB por chunk
      parallelUploads: 3, // Máximo 3 uploads paralelos
      compressionThreshold: 100 * 1024, // Comprimir ficheiros > 100KB
      progressReportingInterval: 1000, // Reportar progresso a cada 1 segundo
      resumableUploadThreshold: 10 * 1024 * 1024 // Uploads resumáveis > 10MB
    };
  }
}

/**
 * Performance Monitor
 * 
 * Black box para monitorização de performance do proxy.
 */
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();

  /**
   * Regista tempo de resposta
   */
  static recordResponseTime(endpoint: string, duration: number): void {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, []);
    }
    
    const times = this.metrics.get(endpoint)!;
    times.push(duration);
    
    // Mantém apenas os últimos 100 registos
    if (times.length > 100) {
      times.shift();
    }
  }

  /**
   * Obtém estatísticas de performance
   */
  static getPerformanceStats(endpoint: string): {
    average: number;
    min: number;
    max: number;
    count: number;
    p95: number;
  } | null {
    const times = this.metrics.get(endpoint);
    if (!times || times.length === 0) {
      return null;
    }

    const sorted = [...times].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, time) => acc + time, 0);
    const p95Index = Math.floor(sorted.length * 0.95);

    return {
      average: sum / sorted.length,
      min: sorted[0] || 0,
      max: sorted[sorted.length - 1] || 0,
      count: sorted.length,
      p95: sorted[p95Index] || sorted[sorted.length - 1] || 0
    };
  }

  /**
   * Obtém todas as estatísticas
   */
  static getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [endpoint, times] of this.metrics.entries()) {
      stats[endpoint] = this.getPerformanceStats(endpoint);
    }
    
    return stats;
  }

  /**
   * Limpa métricas
   */
  static clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Determina se um endpoint está com performance degradada
   */
  static isPerformanceDegraded(endpoint: string, thresholdMs: number = 5000): boolean {
    const stats = this.getPerformanceStats(endpoint);
    if (!stats) {
      return false;
    }
    
    return stats.p95 > thresholdMs;
  }
}

/**
 * Adaptive Configuration Manager
 * 
 * Black box que adapta configurações baseado na performance observada.
 */
export class AdaptiveConfigManager {
  private static currentConfig: PerformanceConfig = PerformanceConfigFactory.createDefaultConfig();
  private static lastAdjustment: number = 0;
  private static readonly adjustmentCooldown = 60000; // 1 minuto

  /**
   * Obtém configuração atual
   */
  static getCurrentConfig(): PerformanceConfig {
    return this.currentConfig;
  }

  /**
   * Ajusta configuração baseado na performance
   */
  static adjustConfigBasedOnPerformance(endpoint: string): PerformanceConfig {
    const now = Date.now();
    
    // Evita ajustes muito frequentes
    if (now - this.lastAdjustment < this.adjustmentCooldown) {
      return this.currentConfig;
    }

    const stats = PerformanceMonitor.getPerformanceStats(endpoint);
    if (!stats || stats.count < 10) {
      return this.currentConfig;
    }

    // Se performance está degradada, aumenta timeouts
    if (stats.p95 > this.currentConfig.baseTimeout * 0.8) {
      console.log(`🔧 AdaptiveConfig: Increasing timeouts for ${endpoint} (P95: ${stats.p95}ms)`);
      
      this.currentConfig = {
        ...this.currentConfig,
        baseTimeout: Math.min(this.currentConfig.baseTimeout * 1.5, this.currentConfig.maxTimeout),
        timeoutPerMb: Math.min(this.currentConfig.timeoutPerMb * 1.2, 30000),
        maxRetries: Math.max(this.currentConfig.maxRetries - 1, 1)
      };
      
      this.lastAdjustment = now;
    }
    
    // Se performance está boa, pode reduzir timeouts
    else if (stats.p95 < this.currentConfig.baseTimeout * 0.3 && stats.average < this.currentConfig.baseTimeout * 0.2) {
      console.log(`🔧 AdaptiveConfig: Decreasing timeouts for ${endpoint} (P95: ${stats.p95}ms)`);
      
      this.currentConfig = {
        ...this.currentConfig,
        baseTimeout: Math.max(this.currentConfig.baseTimeout * 0.8, 10000),
        timeoutPerMb: Math.max(this.currentConfig.timeoutPerMb * 0.9, 5000),
        maxRetries: Math.min(this.currentConfig.maxRetries + 1, 5)
      };
      
      this.lastAdjustment = now;
    }

    return this.currentConfig;
  }

  /**
   * Reseta configuração para padrão
   */
  static resetToDefault(): void {
    this.currentConfig = PerformanceConfigFactory.createDefaultConfig();
    this.lastAdjustment = 0;
    console.log('🔧 AdaptiveConfig: Reset to default configuration');
  }

  /**
   * Força configuração específica
   */
  static forceConfig(config: PerformanceConfig): void {
    this.currentConfig = config;
    this.lastAdjustment = Date.now();
    console.log('🔧 AdaptiveConfig: Forced configuration update');
  }
}
