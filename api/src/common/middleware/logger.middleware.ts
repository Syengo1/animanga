import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../interfaces/request.interface';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const { method, originalUrl, requestId } = req;
    const userAgent = req.get('user-agent') || 'Unknown';
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length') || 0;
      const duration = Date.now() - startTime;

      this.logger.log(
        `[${requestId}] ${method} ${originalUrl} ${statusCode} ${contentLength}b - ${userAgent} ${duration}ms`,
      );
    });

    next();
  }
}
