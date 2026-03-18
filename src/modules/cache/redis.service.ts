import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { getRedisConfig } from '../../configs/redis.config';

/**
 * Application-level Redis cache (separate from Bull). Uses same config as Bull.
 * Use for FX cache, user profile cache, permission cache, etc.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const opts = getRedisConfig(this.config);
    this.client = createClient({
      socket: {
        host: opts.host,
        port: opts.port,
        connectTimeout: opts.connectTimeout ?? 10000,
      },
      password: opts.password || undefined,
      database: opts.db,
    });
    this.client.on('error', (err) => this.logger.error(`Redis: ${err?.message ?? err}`));
    await this.client.connect();
    this.logger.log('Redis cache connected');
  }

  async onModuleDestroy(): Promise<void> {
    const c = this.client;
    this.client = null;
    if (!c) return;
    try {
      if (c.isOpen) {
        await c.quit();
        this.logger.log('Redis cache disconnected');
      }
    } catch (err) {
      const name = (err as Error)?.name ?? '';
      const msg = (err as Error)?.message ?? String(err);
      if (name !== 'ClientClosedError' && !msg.includes('closed')) {
        this.logger.warn(`Redis cache shutdown: ${msg}`);
      }
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds != null && ttlSeconds > 0) {
      await this.client.setEx(key, ttlSeconds, str);
    } else {
      await this.client.set(key, str);
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.client) return null;
    const data = await this.client.get(key);
    if (data == null) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as T;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    const n = await this.client.exists(key);
    return n === 1;
  }
}
