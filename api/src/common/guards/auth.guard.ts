// C:\Projects\animanga-platform\api\src\common\guards\auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedRequest } from '../interfaces/request.interface';
import { SessionService } from '../../modules/identity/services/session.service';

const PROD_AUTH_COOKIE_NAME = '__Host-animanga_session';
const DEV_AUTH_COOKIE_NAME = 'animanga_session';
const BEARER_REGEX = /^Bearer\s+([a-f0-9]{64})$/i;

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException(
        'Missing or invalid authentication token',
      );
    }

    try {
      const sessionData = await this.sessionService.validateSession(token);

      request.user = {
        id: sessionData.userId,
        email: sessionData.email,
      };

      return true;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Session is invalid or expired');
    }
  }

  private extractToken(request: Request): string | undefined {
    // 1. Check HttpOnly session cookies first (supports both prod __Host- prefix and dev fallback)
    const cookies = (request.cookies || {}) as Record<
      string,
      string | undefined
    >;

    const prodToken = cookies[PROD_AUTH_COOKIE_NAME];
    if (typeof prodToken === 'string' && prodToken.trim()) {
      return prodToken.trim();
    }

    const devToken = cookies[DEV_AUTH_COOKIE_NAME];
    if (typeof devToken === 'string' && devToken.trim()) {
      return devToken.trim();
    }

    // 2. Fallback to RFC 6750 Authorization: Bearer <token> header
    const rawAuthHeader = request.headers.authorization;
    if (typeof rawAuthHeader === 'string') {
      const match = BEARER_REGEX.exec(rawAuthHeader.trim());
      if (match?.[1]) {
        return match[1];
      }
    }

    return undefined;
  }
}
