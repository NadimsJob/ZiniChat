import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { QuotaService } from '../../tenants/quota.service';
import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY = 'required_feature';
export const RequireFeature = (feature: string) => SetMetadata(FEATURE_KEY, feature);

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private quotaService: QuotaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user || !user.tenantId) {
      // Superadmins bypass
      if (user && user.role === 'superadmin') return true;
      throw new ForbiddenException('User is not associated with a tenant');
    }

    const hasFeature = await this.quotaService.checkFeature(user.tenantId, requiredFeature);
    
    if (!hasFeature) {
      throw new ForbiddenException(`Your plan does not include the '${requiredFeature}' feature.`);
    }

    return true;
  }
}
