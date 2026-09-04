import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../interfaces/request.interface';

@Injectable()
export class ScannerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const apiKey = request.headers['x-scanner-api-key'];
    if (!apiKey || apiKey !== process.env.SCANNER_API_KEY) {
      throw new UnauthorizedException(
        'Invalid or missing scanner device credentials',
      );
    }

    const rawEventId = request.params.eventId;
    const eventId = Array.isArray(rawEventId) ? rawEventId[0] : rawEventId;

    if (!eventId) {
      throw new UnauthorizedException(
        'Scanner validation requests must be scoped to an eventId route parameter',
      );
    }

    // Authoritative Server-Side Device Identity
    request.device = {
      id: 'hardware-scanner-001',
      type: 'PHYSICAL_GATE_SCANNER',
      eventId: eventId,
      gateId: 'MAIN_GATE', // Server enforces the gate, not the client request body
    };

    return true;
  }
}
