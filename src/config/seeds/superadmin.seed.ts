import { Logger } from '@nestjs/common';
import { UserRole } from '../../modules/user/entities/user.entity';
import { ADMIN_ROLES } from '../roles.config';
import { UserRepository } from '../../modules/user/user.repository';
import { UserService } from '../../modules/user/user.service';

/**
 * Seeds superadmin user if none exist (troott-api user.seed pattern).
 * Requires SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD when RUN_SEED is true and no admin exists.
 */
export async function seedSuperadmin(
  userRepository: UserRepository,
  userService: UserService,
  env: { get: (key: string) => string | undefined },
  logger: Logger,
): Promise<{ seeded: boolean; message: string }> {
  const runSeed = env.get('RUN_SEED') !== 'false';
  if (!runSeed) {
    return { seeded: false, message: 'RUN_SEED is false, skip' };
  }

  const count = await userRepository.countByRoles(ADMIN_ROLES);
  if (count > 0) {
    logger.log('Superadmin seed skipped: admin user(s) already exist');
    return { seeded: false, message: 'Admin(s) already exist' };
  }

  const email = env.get('SUPERADMIN_EMAIL');
  const password = env.get('SUPERADMIN_PASSWORD');
  if (!email || !password) {
    logger.warn(
      'Superadmin seed skipped: set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD to seed first admin',
    );
    return { seeded: false, message: 'Missing SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD' };
  }

  try {
    await userService.createUser({
      email: email.toLowerCase(),
      password,
      firstName: env.get('SUPERADMIN_FIRST_NAME') ?? 'Super',
      lastName: env.get('SUPERADMIN_LAST_NAME') ?? 'Administrator',
      role: UserRole.SUPER_ADMIN,
    });
    logger.log(`Superadmin seeded: ${email}`);
    return { seeded: true, message: `Superadmin ${email} created` };
  } catch (err) {
    logger.error(`Superadmin seed failed: ${err instanceof Error ? err.message : err}`);
    return { seeded: false, message: (err as Error).message };
  }
}
