import { SetMetadata } from '@nestjs/common';
import { PermissionAction } from '../../configs/permissions.config';

export const REQUIRE_PERMISSIONS_KEY = 'requirePermissions';

/**
 * Require one or more permissions (troott-api checkPermission.mdw pattern).
 * Use with RequirePermissionsGuard. User must have at least one of the listed permissions.
 */
export const RequirePermissions = (...permissions: PermissionAction[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);
