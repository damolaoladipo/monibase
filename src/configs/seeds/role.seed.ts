import { getSeedContext, seedLog } from './seed.context';

/**
 * @name seedRoles
 * @description Seeds the roles collection (api configs/seeds/role.seed pattern).
 * Monibase has no separate roles table; roles are enum on User. No-op with log.
 * @returns {Promise<void>}
 */
const seedRoles = async (): Promise<void> => {
  const { logger } = getSeedContext();
  seedLog(logger, {
    type: 'info',
    data: 'Roles seeding skipped (no roles table in monibase; roles are enum on User).',
  });
};

export default seedRoles;
