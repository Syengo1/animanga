// C:\Projects\animanga-platform\api\src\common\guards\authorization.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from '../interfaces/request.interface';
import { AuthorizationService } from '../../modules/identity/services/authorization.service';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission =
      this.reflector.get<string>('permission', context.getHandler()) ??
      this.reflector.get<string>('permission', context.getClass());

    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'User context not found. Authentication required.',
      );
    }

    const isAuthorized: boolean = await this.authorizationService.hasPermission(
      user.id,
      requiredPermission,
    );

    if (!isAuthorized) {
      throw new ForbiddenException(
        `Insufficient permissions: requires ${requiredPermission}`,
      );
    }

    return true;
  }
}
