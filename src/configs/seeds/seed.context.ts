import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../../modules/user/user.repository';
import { UserService } from '../../modules/user/user.service';

/**
 * Context passed into seed functions (api pattern: seeds use global connection;
 * monibase injects via context so seed signatures match api default export async () => void).
 */
export interface SeedContext {
  userRepository: UserRepository;
  userService: UserService;
  config: ConfigService;
  logger: Logger;
}

/**
 * Api-style log: { type: 'info' | 'success' | 'error', data: string }.
 */
export function seedLog(logger: Logger, payload: { type: string; data: string; label?: string }): void {
  const { type, data } = payload;
  if (type === 'error') {
    logger.error(payload.label ? `[${payload.label}] ${data}` : data);
  } else {
    logger.log(data);
  }
}

let seedContext: SeedContext | null = null;

export function setSeedContext(ctx: SeedContext): void {
  seedContext = ctx;
}

export function getSeedContext(): SeedContext {
  if (!seedContext) {
    throw new Error('Seed context not set. Call setSeedContext() before seedData().');
  }
  return seedContext;
}
