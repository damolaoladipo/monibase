/**
 * Database (PostgreSQL) config (troott-api db.config pattern).
 * Typed config and factory for TypeORM options.
 */
export interface DbConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  connectTimeout?: number;
  socketTimeout?: number;
}

export function getDbConfig(env: { get: (key: string) => string | undefined }): DbConfig {
  return {
    host: env.get('DB_HOST') ?? 'localhost',
    port: parseInt(env.get('DB_PORT') ?? '5432', 10),
    username: env.get('DB_USERNAME') ?? 'postgres',
    password: env.get('DB_PASSWORD') ?? '',
    database: env.get('DB_DATABASE') ?? 'monibase',
    connectTimeout: 6000,
    socketTimeout: 6000,
  };
}

export function getTypeOrmOptionsFromDbConfig(db: DbConfig) {
  return {
    type: 'postgres' as const,
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    autoLoadEntities: true,
    migrations: [],
    migrationsRun: false,
  };
}
