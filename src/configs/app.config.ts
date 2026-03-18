/**
 * Application config and env helpers (api configs/app.config pattern).
 * Separation of concerns: body parser, CORS, rate limit, security middleware options.
 */
export type NodeEnv = 'development' | 'production' | 'test' | 'staging';

/** Body parser limit (api: 50mb). */
export const BODY_PARSER_LIMIT = '50mb';

/** Rate limit: 30 min window, 1000 max (api ratelimit.mdw). */
export const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000;
export const RATE_LIMIT_MAX = 1000;
export const RATE_LIMIT_MESSAGE = 'You have exceeded the number of requests. Try again in 30 minutes.';
export const RATE_LIMIT_STATUS_CODE = 403;

export interface AppConfig {
  port: number;
  nodeEnv: NodeEnv;
  appName: string;
  appVersion: string;
  corsOrigins: string[] | true;
}

export function getAppConfig(env: { get: (key: string) => string | undefined }): AppConfig {
  const nodeEnv = (env.get('NODE_ENV') ?? 'development') as NodeEnv;
  const port = parseInt(env.get('PORT') ?? '3000', 10);
  return {
    port,
    nodeEnv,
    appName: 'Monibase FX Trading API',
    appVersion: '1.0',
    corsOrigins: nodeEnv === 'production' ? ['https://your-domain.com'] : true,
  };
}

/** Skip sanitize / strict middleware in test (api: skip expressSanitize in Jest). */
export function isTestEnvironment(): boolean {
  return (
    process.env.JEST_WORKER_ID !== undefined ||
    process.env.NODE_ENV === 'test' ||
    (typeof process.env.npm_lifecycle_event === 'string' &&
      process.env.npm_lifecycle_event.includes('test'))
  );
}

/** Rate limit options for express-rate-limit (api ratelimit.mdw). */
export function getRateLimitOptions(): {
  windowMs: number;
  max: number;
  message: string;
  statusCode: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
} {
  return {
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    message: RATE_LIMIT_MESSAGE,
    statusCode: RATE_LIMIT_STATUS_CODE,
    standardHeaders: true,
    legacyHeaders: false,
  };
}

/** Stricter rate limit for auth routes (register, verify, login). Per IP. */
export function getAuthRateLimitOptions(): {
  windowMs: number;
  max: number;
  message: string;
  statusCode: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
} {
  return {
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many auth attempts. Try again in 15 minutes.',
    statusCode: 403,
    standardHeaders: true,
    legacyHeaders: false,
  };
}

/** Stricter rate limit for high-value wallet endpoints (fund, trade, convert, transfer). Per IP. */
export function getHighValueRateLimitOptions(): {
  windowMs: number;
  max: number;
  message: string;
  statusCode: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
} {
  return {
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: 'Too many wallet operations. Try again in 1 hour.',
    statusCode: 403,
    standardHeaders: true,
    legacyHeaders: false,
  };
}

/** CORS options with origin callback (api app.config: allow no origin, localhost, configurable domains). */
export function getCorsOptions(env: { get: (key: string) => string | undefined }): {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void;
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
} {
  const allowedOriginsStr = env.get('CORS_ORIGINS');
  const allowedOrigins = allowedOriginsStr
    ? allowedOriginsStr.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  return {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) return callback(null, true);
      if (allowedOrigins.length > 0 && allowedOrigins.some((o) => origin.includes(o))) {
        return callback(null, true);
      }
      if (allowedOrigins.length === 0) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
    ],
  };
}

/**
 * Env helper for runtime checks (troott-api ENV util).
 */
export class AppEnv {
  constructor(private readonly nodeEnv: string) {}

  isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  isStaging(): boolean {
    return this.nodeEnv === 'staging';
  }

  isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  isTest(): boolean {
    return this.nodeEnv === 'test';
  }
}

export function createAppEnv(env: { get: (key: string) => string | undefined }): AppEnv {
  return new AppEnv(env.get('NODE_ENV') ?? 'development');
}
