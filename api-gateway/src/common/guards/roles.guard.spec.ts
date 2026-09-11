import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockExecutionContext = (user?: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('Test 1: should return true when route does not require any role (no @Roles metadata)', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      const context = createMockExecutionContext({ role: 'CASHIER' });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('Test 2.1: should throw ForbiddenException when request has no user', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'MANAGER']);
      const context = createMockExecutionContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('No role found');
    });

    it('Test 2.2: should throw ForbiddenException when user object does not have role property', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'MANAGER']);
      const context = createMockExecutionContext({ username: 'john_doe' });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('No role found');
    });

    it('Test 3: should throw ForbiddenException when route requires ["ADMIN", "MANAGER"] but user has role "CASHIER"', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'MANAGER']);
      const context = createMockExecutionContext({ role: 'CASHIER' });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Insufficient role permissions');
    });

    it('Test 4: should return true when route requires ["ADMIN", "MANAGER"] and user has role "MANAGER"', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'MANAGER']);
      const context = createMockExecutionContext({ role: 'MANAGER' });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('Test 5: should return true when route requires ["ADMIN"] and user has role "ADMIN"', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
      const context = createMockExecutionContext({ role: 'ADMIN' });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
