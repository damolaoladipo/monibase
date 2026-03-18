import { UserRole } from '../../modules/user/entities/user.entity';
import { ADMIN_ROLES } from '../roles.config';
import { getSeedContext, seedLog } from './seed.context';

/**
 * @name seedUsers
 * @description Seeds the users collection (api configs/seeds/user.seed pattern).
 * Seeds superadmin if none exist. Requires SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD when ENABLE_SEEDING=true.
 * @returns {Promise<void>}
 * @throws {Error} If required env vars missing
 */
const seedUsers = async (): Promise<void> => {
  const { userRepository, userService, config, logger } = getSeedContext();

  const superAdminEmail = config.get<string>('SUPERADMIN_EMAIL');
  const superAdminPassword = config.get<string>('SUPERADMIN_PASSWORD');
  const superAdminFirstName = config.get<string>('SUPERADMIN_FIRST_NAME');
  const superAdminLastName = config.get<string>('SUPERADMIN_LAST_NAME');

  if (!superAdminEmail || !superAdminPassword) {
    seedLog(logger, {
      type: 'info',
      data: 'Superadmin seed skipped: set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD to seed first admin.',
    });
    return;
  }

  const count = await userRepository.countByRoles(ADMIN_ROLES);
  if (count > 0) {
    seedLog(logger, {
      type: 'info',
      data: 'Superadmin user already exists. Skipping.',
    });
    return;
  }

  try {
    await userService.createUser({
      email: superAdminEmail.toLowerCase(),
      password: superAdminPassword,
      firstName: superAdminFirstName ?? 'Super',
      lastName: superAdminLastName ?? 'Administrator',
      role: UserRole.SUPER_ADMIN,
    });
    seedLog(logger, {
      type: 'success',
      data: `Superadmin seeded successfully: ${superAdminEmail}`,
    });
  } catch (err) {
    seedLog(logger, {
      label: 'SEEDING_ERROR',
      type: 'error',
      data: `User seeding failed: ${err instanceof Error ? err.message : err}`,
    });
    throw err;
  }
};

export default seedUsers;
