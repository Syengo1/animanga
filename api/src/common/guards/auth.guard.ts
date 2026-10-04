import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedRequest } from '../interfaces/request.interface';
import { SessionService } from '../../modules/identity/services/session.service';

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
      // Validates the token against the database and checks for revocation/expiration
      const sessionData = await this.sessionService.validateSession(token);

      // Attach the resolved user identity to the request context
      request.user = {
        id: sessionData.userId,
        email: sessionData.email,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Session is invalid or expired');
    }
  }

  private extractToken(request: Request): string | undefined {
    // 1. Try secure cookies first (The primary mechanism for web browsers)
    const isProd = process.env.NODE_ENV === 'production';
    const cookieName = isProd ? '__Host-animanga_session' : 'animanga_session';

    // Safely parse cookies as a Record
    const cookies = (request.cookies || {}) as Record<
      string,
      string | undefined
    >;
    if (cookies[cookieName]) {
      return cookies[cookieName];
    }

    // 2. Fallback to Bearer token (For mobile apps, CLI, or API clients)
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer' && token) {
        return token;
      }
    }

    return undefined;
  }
}
