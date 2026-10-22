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

    // Category mapping for backward compatibility with legacy permissions and tenant modules
    const categoryMap: Record<string, string[]> = {
      // Superadmin permissions
      'manage:tenants': ['view:tenants', 'manage:tenants', 'impersonate:tenants', 'delete:tenants'],
      'manage:billing': ['view:billing', 'manage:billing', 'view:packages', 'manage:packages', 'view:coupons', 'manage:coupons', 'view:payments', 'approve:payments'],
      'manage:site': ['view:site_editor', 'manage:site_editor', 'view:inquiries', 'manage:inquiries', 'view:tickets', 'manage:tickets', 'view:templates', 'manage:templates', 'view:support_chats', 'view:settings', 'manage:settings', 'manage:currency'],
      'manage:audit': ['view:audit_logs', 'view:security_logs', 'manage:audit'],
      'manage:team': ['view:team', 'manage:team'],

      // Tenant modules -> Granular actions
      'inbox': ['inbox', 'inbox:view', 'inbox:reply', 'inbox:assign', 'inbox:delete'],
      'inboxes': ['inboxes', 'inboxes:manage'],
      'leads': ['leads', 'leads:view', 'leads:manage', 'leads:export'],
      'products': ['products', 'products:view', 'products:manage'],
      'orders': ['orders', 'orders:view', 'orders:manage'],
      'broadcasts': ['broadcasts', 'broadcasts:view', 'broadcasts:create'],
      'zini_mail': ['zini_mail', 'zini_mail:view', 'zini_mail:manage'],
      'meta_ads': ['meta_ads', 'meta_ads:view', 'meta_ads:manage'],
      'capi_hub': ['capi_hub', 'capi_hub:view', 'capi_hub:manage'],
      'ai_training': ['ai_training', 'ai_training:view', 'ai_training:manage'],
      'team': ['team', 'team:view', 'team:manage'],
      'storage': ['storage', 'storage:view', 'storage:manage'],
      'settings': ['settings', 'settings:view', 'settings:manage'],
      'subscription': ['subscription', 'subscription:view', 'billing:view'],
      'billing_history': ['billing_history', 'billing:view'],
      'support': ['support'],
    };

    const hasPermission = requiredPermissions.some((permission) => {
      if (user.permissions.includes(permission) || user.permissions.includes('*')) return true;
      for (const [legacy, subPerms] of Object.entries(categoryMap)) {
        // If user has module key and endpoint requires sub-permission
        if (user.permissions.includes(legacy) && subPerms.includes(permission)) return true;
        // If endpoint requires module key and user has any sub-action permission
        if (permission === legacy && subPerms.some((sp) => user.permissions.includes(sp))) return true;
      }
      return false;
    });

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
