/**
 * Application config and env helpers (troott-api app.config / env.util pattern).
 */
export type NodeEnv = 'development' | 'production' | 'test' | 'staging';

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
