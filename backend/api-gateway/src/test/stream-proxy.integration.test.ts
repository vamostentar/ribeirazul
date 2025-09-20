import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DefaultMultipartStreamValidator } from '../implementations/multipart-validator.implementation.js';
import { DefaultStreamErrorHandler } from '../implementations/stream-error-handler.implementation.js';
import { DefaultStreamProxy } from '../implementations/stream-proxy.implementation.js';
import { StreamProxyConfig, StreamProxyRequest } from '../interfaces/stream-proxy.interface.js';

describe('StreamProxy Integration Tests', () => {
  let streamProxy: DefaultStreamProxy;
  let multipartValidator: DefaultMultipartStreamValidator;
  let errorHandler: DefaultStreamErrorHandler;

  beforeEach(() => {
    multipartValidator = new DefaultMultipartStreamValidator();
    errorHandler = new DefaultStreamErrorHandler();
    streamProxy = new DefaultStreamProxy(multipartValidator, errorHandler);
  });

  describe('Multipart Upload Validation', () => {
    it('should validate multipart headers correctly', () => {
      const headers = {
        'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'
      };

      const result = multipartValidator.validateUploadHeaders(headers);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid multipart headers', () => {
      const headers = {
        'content-type': 'multipart/form-data'
      };

      const result = multipartValidator.validateUploadHeaders(headers);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid or missing multipart Content-Type');
    });

    it('should extract boundary correctly', () => {
      const contentType = 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW';
      const boundary = multipartValidator.extractBoundary(contentType);
      
      expect(boundary).toBe('----WebKitFormBoundary7MA4YWxkTrZu0gW');
    });
  });

  describe('Error Handling', () => {
    it('should handle timeout errors correctly', () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';

      const proxyError = errorHandler.handleStreamError(timeoutError, {
        requestUrl: '/test',
        targetUrl: 'http://test.com',
        method: 'POST'
      });

      expect(proxyError.code).toBe('TIMEOUT_ERROR');
      expect(proxyError.statusCode).toBe(408);
      expect(proxyError.retryable).toBe(true);
    });

    it('should handle connection errors correctly', () => {
      const connectionError = new Error('ECONNREFUSED');
      (connectionError as any).code = 'ECONNREFUSED';

      const proxyError = errorHandler.handleStreamError(connectionError, {
        requestUrl: '/test',
        targetUrl: 'http://test.com',
        method: 'POST'
      });

      expect(proxyError.code).toBe('CONNECTION_ERROR');
      expect(proxyError.statusCode).toBe(502);
      expect(proxyError.retryable).toBe(true);
    });

    it('should calculate retry delay correctly', () => {
      const proxyError = {
        code: 'TIMEOUT_ERROR',
        message: 'Request timeout',
        statusCode: 408,
        retryable: true
      };

      const delay1 = errorHandler.getRetryDelay(proxyError, 1);
      const delay2 = errorHandler.getRetryDelay(proxyError, 2);
      const delay3 = errorHandler.getRetryDelay(proxyError, 3);

      expect(delay1).toBeGreaterThan(900);
      expect(delay1).toBeLessThan(1200);
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });
  });

  describe('Dynamic Timeout Calculation', () => {
    it('should calculate timeout based on content length', () => {
      const baseTimeout = streamProxy.getDynamicTimeout();
      const smallFileTimeout = streamProxy.getDynamicTimeout(1024); // 1KB
      const largeFileTimeout = streamProxy.getDynamicTimeout(10 * 1024 * 1024); // 10MB

      expect(baseTimeout).toBe(30000); // 30 seconds base
      expect(smallFileTimeout).toBeGreaterThan(baseTimeout);
      expect(largeFileTimeout).toBeGreaterThan(smallFileTimeout);
    });

    it('should cap timeout at maximum value', () => {
      const hugeFileTimeout = streamProxy.getDynamicTimeout(1000 * 1024 * 1024); // 1GB
      expect(hugeFileTimeout).toBe(300000); // 5 minutes max
    });
  });

  describe('Request Validation', () => {
    it('should validate valid requests', () => {
      const validRequest: StreamProxyRequest = {
        method: 'POST',
        url: '/api/v1/properties/123/images',
        headers: {
          'content-type': 'multipart/form-data; boundary=test'
        },
        body: undefined,
        rawRequest: {}
      };

      expect(streamProxy.canProxy(validRequest)).toBe(true);
    });

    it('should reject invalid methods', () => {
      const invalidRequest: StreamProxyRequest = {
        method: 'INVALID',
        url: '/api/v1/properties/123/images',
        headers: {},
        body: undefined,
        rawRequest: {}
      };

      expect(streamProxy.canProxy(invalidRequest)).toBe(false);
    });

    it('should reject requests without URL', () => {
      const invalidRequest: StreamProxyRequest = {
        method: 'POST',
        url: '',
        headers: {},
        body: undefined,
        rawRequest: {}
      };

      expect(streamProxy.canProxy(invalidRequest)).toBe(false);
    });
  });

  describe('Boundary Validation', () => {
    it('should validate boundary format correctly', () => {
      const validBoundaries = [
        'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW',
        'multipart/form-data; boundary=simple123',
        'multipart/form-data; boundary=a-b_c.d:e=f?g'
      ];

      validBoundaries.forEach(contentType => {
        expect(multipartValidator.hasValidBoundary(contentType)).toBe(true);
      });
    });

    it('should reject invalid boundary formats', () => {
      const invalidBoundaries = [
        'multipart/form-data; boundary=',
        'multipart/form-data; boundary=with spaces',
        'multipart/form-data; boundary=' + 'a'.repeat(100), // too long
        'multipart/form-data' // missing boundary
      ];

      invalidBoundaries.forEach(contentType => {
        expect(multipartValidator.hasValidBoundary(contentType)).toBe(false);
      });
    });
  });
});

/**
 * Mock Tests para Stream Proxy
 */
describe('StreamProxy Mock Tests', () => {
  let streamProxy: DefaultStreamProxy;

  beforeEach(() => {
    // Mock fetch global
    global.fetch = vi.fn();
    streamProxy = new DefaultStreamProxy();
  });

  it('should handle successful proxy requests', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Map([
        ['content-type', 'application/json']
      ]),
      body: new ReadableStream()
    };

    (global.fetch as any).mockResolvedValue(mockResponse);

    const request: StreamProxyRequest = {
      method: 'POST',
      url: '/api/v1/test',
      headers: {
        'content-type': 'application/json'
      },
      body: undefined,
      rawRequest: {}
    };

    const config: StreamProxyConfig = {
      targetUrl: 'http://test.com/api/v1/test',
      timeoutMs: 30000,
      maxRetries: 3,
      retryDelayMs: 1000,
      bufferSize: 64 * 1024
    };

    const response = await streamProxy.proxyStream(request, config);

    expect(response.statusCode).toBe(200);
    expect(response.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://test.com/api/v1/test',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json'
        })
      })
    );
  });

  it('should handle proxy errors with retry', async () => {
    const mockError = new Error('Network error');
    (mockError as any).code = 'ECONNREFUSED';

    (global.fetch as any)
      .mockRejectedValueOnce(mockError)
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        body: new ReadableStream()
      });

    const request: StreamProxyRequest = {
      method: 'GET',
      url: '/api/v1/test',
      headers: {},
      body: undefined,
      rawRequest: {}
    };

    const config: StreamProxyConfig = {
      targetUrl: 'http://test.com/api/v1/test',
      timeoutMs: 30000,
      maxRetries: 3,
      retryDelayMs: 100,
      bufferSize: 64 * 1024
    };

    const response = await streamProxy.proxyStream(request, config);

    expect(response.statusCode).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});

