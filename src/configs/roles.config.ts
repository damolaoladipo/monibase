import { UserRole } from '../modules/user/entities/user.entity';

/**
 * Roles that can access admin-only endpoints and bypass KYC (e.g. KYC review, bypass trading checks).
 * Single source of truth for "admin" role set across guards and seeds.
 */
export const ADMIN_ROLES: string[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role);
}

export { UserRole };
