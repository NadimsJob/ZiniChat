import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('No user found');
    }

    if (user.role === 'superadmin' || user.role === 'owner' || user.role === 'admin' || (user.permissions && user.permissions.includes('*'))) {
      return true; // Wildcard master admin / tenant owner & admin
    }

    if (!user.permissions) {
      throw new ForbiddenException('No permissions found');
    }

    const hasPermission = requiredPermissions.some((permission) => user.permissions.includes(permission));
    
    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }
    
    return true;
  }
}
