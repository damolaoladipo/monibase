import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { hasPermission } from '../../config/permissions.config';
import type { PermissionAction } from '../../config/permissions.config';
import { JwtPayload } from '../decorators/current-user.decorator';

/**
 * Guard that requires at least one of the permissions from @RequirePermissions() (troott-api checkPermission.mdw pattern).
 * Use after JwtAuthGuard so request.user is set.
 */
@Injectable()
export class RequirePermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionAction[]>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions?.length) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;
    if (!user?.role) {
      throw new ForbiddenException('Forbidden');
    }
    const hasAny = requiredPermissions.some((p) => hasPermission(user.role, p));
    if (!hasAny) {
      throw new ForbiddenException('Forbidden');
    }
    return true;
  }
}
