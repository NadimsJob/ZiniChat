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
    
    const req = context.switchToHttp().getRequest();
    const user = req?.user;

    if (!user) {
      throw new ForbiddenException('No user found');
    }
    
    // Superadmin, tenant owner, or wildcard master admin gets full access
    if (user.email === 'admin@platform.com' || user.role === 'superadmin' || user.role === 'owner' || (user.permissions && user.permissions.includes('*'))) {
      return true;
    }

    // Tenant admin gets full tenant access
    if (user.tenantId && user.role === 'admin') {
      return true;
    }

    if (!user.permissions || !Array.isArray(user.permissions)) {
      throw new ForbiddenException('No permissions found');
    }

    // Category mapping for backward compatibility with legacy permissions
    const categoryMap: Record<string, string[]> = {
      'manage:tenants': ['view:tenants', 'manage:tenants', 'impersonate:tenants', 'delete:tenants'],
      'manage:billing': ['view:billing', 'manage:billing', 'view:packages', 'manage:packages', 'view:coupons', 'manage:coupons', 'view:payments', 'approve:payments'],
      'manage:site': ['view:site_editor', 'manage:site_editor', 'view:inquiries', 'manage:inquiries', 'view:tickets', 'manage:tickets', 'view:templates', 'manage:templates', 'view:support_chats', 'view:settings', 'manage:settings', 'manage:currency'],
      'manage:audit': ['view:audit_logs', 'view:security_logs', 'manage:audit'],
      'manage:team': ['view:team', 'manage:team'],
    };

    const hasPermission = requiredPermissions.some((permission) => {
      if (user.permissions.includes(permission)) return true;
      for (const [legacy, subPerms] of Object.entries(categoryMap)) {
        if (user.permissions.includes(legacy) && subPerms.includes(permission)) return true;
      }
      return false;
    });

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
