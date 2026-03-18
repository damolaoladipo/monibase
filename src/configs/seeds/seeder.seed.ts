import { getSeedContext, seedLog } from './seed.context';
import seedRoles from './role.seed';
import seedPermissions from './permission.seed';
import seedUsers from './user.seed';

/**
 * @name seedData
 * @description Seeds all collections in the correct order (api configs/seeds/seeder.seed pattern):
 * 1. Roles (no-op in monibase)
 * 2. Permissions (no-op in monibase)
 * 3. Users (superadmin)
 *
 * Seeding is conditional:
 * - Only runs if ENABLE_SEEDING=true (required in all environments)
 * - Individual seed functions have built-in safety checks
 *
 * @async
 * @function seedData
 * @returns {Promise<void>}
 */
const seedData = async (): Promise<void> => {
  if (process.env.ENABLE_SEEDING !== 'true') {
    const { logger } = getSeedContext();
    seedLog(logger, {
      type: 'info',
      data: 'Seeding disabled. Set ENABLE_SEEDING=true in .env to enable.',
    });
    return;
  }

  const { logger } = getSeedContext();
  seedLog(logger, {
    type: 'info',
    data: 'Starting database seeding...',
  });

  await seedRoles();
  await seedPermissions();
  await seedUsers();

  seedLog(logger, {
    type: 'success',
    data: 'Database seeding completed successfully.',
  });
};

export default seedData;
