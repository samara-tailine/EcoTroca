import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { AuthenticatedUser } from '../auth.types.js';
import { AccessProfileKey } from '../../users/access-profile.constants.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      AccessProfileKey[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    // A lista é explícita: ADMIN não herda LIBRARY nem XEROX.
    const allowed = request.user?.roles.some((role) => requiredRoles.includes(role)) ?? false;
    if (!allowed) throw new ForbiddenException('Seu perfil não possui permissão para esta operação.');
    return true;
  }
}