import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { AuthenticatedRequest } from '../interfaces/request.interface';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // Respect incoming trace IDs from infrastructure, or generate a new one
    const headerId =
      req.headers['x-request-id'] || req.headers['x-correlation-id'];
    const requestId =
      (Array.isArray(headerId) ? headerId[0] : headerId) || crypto.randomUUID();

    req.requestId = requestId;

    // Normalize headers for downstream services and clients
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);

    next();
  }
}
