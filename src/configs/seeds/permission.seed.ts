import { getSeedContext, seedLog } from './seed.context';

/**
 * @name seedPermissions
 * @description Seeds the permissions collection (api configs/seeds/permission.seed pattern).
 * Monibase has no separate permissions table; permissions are in config. No-op with log.
 * @returns {Promise<void>}
 */
const seedPermissions = async (): Promise<void> => {
  const { logger } = getSeedContext();
  seedLog(logger, {
    type: 'info',
    data: 'Permissions seeding skipped (no permissions table in monibase; permissions in config).',
  });
};

export default seedPermissions;
