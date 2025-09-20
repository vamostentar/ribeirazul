export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '8081'),
  HOST: process.env.HOST || '0.0.0.0',

  // Services
  PROPERTIES_SERVICE_URL: process.env.PROPERTIES_SERVICE_URL || 'http://properties:8082',
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://auth:8084',
  MEDIA_SERVICE_URL: process.env.MEDIA_SERVICE_URL || 'http://media:8083',
  SETTINGS_SERVICE_URL: process.env.SETTINGS_SERVICE_URL || 'http://settings:8085',
  USERS_SERVICE_URL: process.env.USERS_SERVICE_URL || 'http://users:8086',

  // CORS Origins (accept both CORS_ORIGINS and CORS_ORIGIN)
  CORS_ORIGINS: (() => {
    const raw = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || process.env.CORS || '';
    if (raw && raw.trim().length > 0) {
      return raw.split(',').map(s => s.trim());
    }
    // Fallback to API_URL if provided
    if (process.env.API_URL) {
      return [process.env.API_URL];
    }
    // Development defaults
    return [
      'http://localhost:3001',
      'http://localhost:3000'
    ];
  })(),

  // Production settings
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'info'),
  ENABLE_DETAILED_LOGGING: process.env.ENABLE_DETAILED_LOGGING === 'true' || process.env.NODE_ENV !== 'production',
};

