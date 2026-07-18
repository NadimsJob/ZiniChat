import { PermissionsGuard } from './permissions.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  const mockExecutionContext = (user: any, requiredPermissions: string[] = ['manage:billing']): ExecutionContext => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredPermissions);
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if no permissions are required', () => {
    const context = mockExecutionContext({ id: 'u1' }, []);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user is not in request', () => {
    const context = mockExecutionContext(null);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('No user found');
  });

  it('should bypass and allow if user role is superadmin', () => {
    const context = mockExecutionContext({ role: 'superadmin' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should bypass and allow if user role is owner', () => {
    const context = mockExecutionContext({ role: 'owner' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should bypass and allow if user has wildcard permission *', () => {
    const context = mockExecutionContext({ role: 'agent', permissions: ['*'] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user has no permissions array', () => {
    const context = mockExecutionContext({ role: 'agent' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('No permissions found');
  });

  it('should throw ForbiddenException if user lacks required permission', () => {
    const context = mockExecutionContext({ role: 'agent', permissions: ['view:leads'] });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Insufficient permissions');
  });

  it('should allow access if user has required permission', () => {
    const context = mockExecutionContext({ role: 'agent', permissions: ['manage:billing'] });
    expect(guard.canActivate(context)).toBe(true);
  });
});
