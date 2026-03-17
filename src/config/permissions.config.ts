import { ADMIN_ROLES, UserRole } from './roles.config';

/**
 * Permission actions (string identifiers). Use in guards or decorators to check capability.
 * No DB tables; role -> permissions defined here.
 */
export const Permission = {
  KYC_LIST_PENDING: 'kyc:list-pending',
  KYC_REVIEW: 'kyc:review',
} as const;

export type PermissionAction = (typeof Permission)[keyof typeof Permission];

/**
 * Map role -> list of permission actions. Admin roles get all permissions.
 */
const ROLE_PERMISSIONS: Record<string, PermissionAction[]> = {
  [UserRole.USER]: [],
  [UserRole.ADMIN]: [Permission.KYC_LIST_PENDING, Permission.KYC_REVIEW],
  [UserRole.SUPER_ADMIN]: [Permission.KYC_LIST_PENDING, Permission.KYC_REVIEW],
};

export function getPermissionsForRole(role: string): PermissionAction[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: string, permission: PermissionAction): boolean {
  if (ADMIN_ROLES.includes(role)) return true;
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}
