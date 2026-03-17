import { Logger } from '@nestjs/common';
import { UserRepository } from '../../modules/user/user.repository';
import { UserService } from '../../modules/user/user.service';
import { seedSuperadmin } from './superadmin.seed';

/**
 * Runs all seeds in order (troott-api seeder.seed pattern).
 * Order: superadmin (no roles table in monibase).
 */
export async function seedData(
  userRepository: UserRepository,
  userService: UserService,
  env: { get: (key: string) => string | undefined },
  logger: Logger,
): Promise<void> {
  await seedSuperadmin(userRepository, userService, env, logger);
}
