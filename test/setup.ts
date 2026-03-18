/**
 * Global test setup. Sets env and mocks before any imports that use them.
 * For e2e, set DB_* to a test database (e.g. DB_DATABASE=monibase_test).
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-chars-long';
process.env.JWT_EXPIRY = '7d';
process.env.DB_HOST = process.env.DB_HOST ?? 'localhost';
process.env.DB_PORT = process.env.DB_PORT ?? '5432';
process.env.DB_USERNAME = process.env.DB_USERNAME ?? 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? '';
process.env.DB_DATABASE = process.env.DB_DATABASE ?? 'monibase_test';
process.env.MAIL_HOST = process.env.MAIL_HOST ?? 'localhost';
process.env.MAIL_PORT = process.env.MAIL_PORT ?? '587';
process.env.MAIL_USER = '';
process.env.MAIL_PASSWORD = '';
process.env.MAIL_FROM = 'admin@monibase.so';
process.env.FX_API_URL = 'https://api.exchangerate.test/v1';
process.env.FX_API_KEY = 'test-key';
process.env.FX_CACHE_TTL_SECONDS = '300';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = '';
process.env.REDIS_DB = '0';
process.env.APP_URL = 'http://localhost:3000';
process.env.RUN_SEED = 'false';
process.env.ENABLE_SEEDING = 'false';

// Mock Bull so tests do not connect to Redis
const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  addBulk: jest.fn().mockResolvedValue([]),
  process: jest.fn(),
  on: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
  name: 'mock',
};
jest.mock('bull', () => {
  return function MockQueue() {
    return mockQueue;
  };
});

jest.setTimeout(20000);
