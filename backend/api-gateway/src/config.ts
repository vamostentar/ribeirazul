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
    const normalize = (originsRaw?: string | string[]) => {
      const corsVar = originsRaw || '';
      if (!corsVar) return [] as string[];
      const arr = (typeof corsVar === 'string' ? corsVar.split(',') : corsVar).map(s => s.trim()).filter(s => s.length > 0);
      const normalized = new Set<string>();
      for (const o of arr) {
        try {
          const u = new URL(o);
          normalized.add(u.origin);
          const host = u.hostname;
          if (host.startsWith('www.')) {
            normalized.add(`${u.protocol}//${host.replace(/^www\./, '')}`);
          } else {
            normalized.add(`${u.protocol}//www.${host}`);
          }
        } catch (e) {
          if (typeof o === 'string' && o.length) normalized.add(o);
        }
      }
      return Array.from(normalized);
    };

    const normalized = normalize(raw);
    if (normalized.length > 0) {
      console.log('🔧 CORS Origins loaded from environment:', normalized);
      return normalized;
    }
    // Fallback to API_URL if provided
    if (process.env.API_URL) {
      const fallback = normalize([process.env.API_URL]);
      console.log('🔧 CORS Origins fallback to API_URL:', fallback);
      return fallback;
    }
    // Development defaults
    const defaults = [
      'http://localhost:3001',
      'http://localhost:3000'
    ];
    console.log('🔧 CORS Origins using development defaults:', defaults);
    return defaults;
  })(),

  // Production settings
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'info'),
  ENABLE_DETAILED_LOGGING: process.env.ENABLE_DETAILED_LOGGING === 'true' || process.env.NODE_ENV !== 'production',
};

