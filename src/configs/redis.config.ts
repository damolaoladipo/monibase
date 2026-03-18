/**
 * Redis config for Bull queue (troott-api redis.config pattern).
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  connectTimeout?: number;
}

export function getRedisConfig(env: { get: (key: string) => string | undefined }): RedisConfig {
  return {
    host: env.get('REDIS_HOST') ?? 'localhost',
    port: parseInt(env.get('REDIS_PORT') ?? '6379', 10),
    password: env.get('REDIS_PASSWORD') || undefined,
    db: parseInt(env.get('REDIS_DB') ?? '0', 10),
    connectTimeout: 30000,
  };
}
