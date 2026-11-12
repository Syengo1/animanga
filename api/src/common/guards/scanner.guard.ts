// C:\Projects\animanga-platform\api\src\common\guards\scanner.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { AuthenticatedRequest } from '../interfaces/request.interface';

@Injectable()
export class ScannerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const rawHeaderKey = request.headers['x-scanner-api-key'];
    const providedKey = Array.isArray(rawHeaderKey)
      ? rawHeaderKey[0]
      : rawHeaderKey;
    const expectedKey = process.env.SCANNER_API_KEY;

    if (!providedKey || !expectedKey) {
      throw new UnauthorizedException(
        'Invalid or missing scanner device credentials',
      );
    }

    const providedBuf = Buffer.from(providedKey);
    const expectedBuf = Buffer.from(expectedKey);

    if (
      providedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
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

    const rawDeviceId = request.headers['x-scanner-device-id'];
    const rawGateId = request.headers['x-scanner-gate-id'];

    request.device = {
      id:
        (Array.isArray(rawDeviceId) ? rawDeviceId[0] : rawDeviceId) ||
        'hardware-scanner-001',
      type: 'PHYSICAL_GATE_SCANNER',
      eventId,
      gateId:
        (Array.isArray(rawGateId) ? rawGateId[0] : rawGateId) || 'MAIN_GATE',
    };

    return true;
  }
}
