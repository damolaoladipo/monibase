import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').optional(),
  DB_DATABASE: Joi.string().required(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRY: Joi.string().default('7d'),

  MAIL_HOST: Joi.string().required(),
  MAIL_PORT: Joi.number().default(587),
  MAIL_USER: Joi.string().allow('').optional(),
  MAIL_PASSWORD: Joi.string().allow('').optional(),
  MAIL_FROM: Joi.string().email().required(),

  FX_API_URL: Joi.string().uri().required(),
  FX_API_KEY: Joi.string().allow('').optional(),
  FX_CACHE_TTL_SECONDS: Joi.number().default(300),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().default(0),

  APP_URL: Joi.string().uri().optional(),

  STORAGE_LOCAL_PATH: Joi.string().optional(),

  RUN_SEED: Joi.string().valid('true', 'false').optional(),
  SUPERADMIN_EMAIL: Joi.string().email().optional(),
  SUPERADMIN_PASSWORD: Joi.string().min(8).optional(),
  SUPERADMIN_FIRST_NAME: Joi.string().optional(),
  SUPERADMIN_LAST_NAME: Joi.string().optional(),
});
