// C:\Projects\animanga-platform\api\src\common\interceptors\transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthenticatedRequest } from '../interfaces/request.interface';

export interface ResponseEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface WebhookAckResponse {
  ResultCode: number;
  ResultDesc: string;
}

export type InterceptorResponse<T> =
  | ResponseEnvelope<T>
  | WebhookAckResponse
  | null
  | undefined;

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  InterceptorResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<InterceptorResponse<T>> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return next.handle().pipe(
      map((payload: T): InterceptorResponse<T> => {
        if (payload === undefined || payload === null) {
          return payload as null | undefined;
        }

        const meta = {
          timestamp: new Date().toISOString(),
          requestId: request.requestId || 'unknown',
        };

        if (typeof payload === 'object') {
          const record = payload as unknown as Record<string, unknown>;

          // 1. Preserve raw third-party webhook contracts (e.g. Safaricom Daraja ResultCode)
          if (
            typeof record.ResultCode === 'number' &&
            typeof record.ResultDesc === 'string'
          ) {
            return {
              ResultCode: record.ResultCode,
              ResultDesc: record.ResultDesc,
            };
          }

          // 2. Prevent double-wrapping if a controller already returned { success: true, data: ... }
          if (typeof record.success === 'boolean' && 'data' in record) {
            return {
              success: record.success,
              ...(typeof record.message === 'string'
                ? { message: record.message }
                : {}),
              data: record.data as T,
              meta:
                typeof record.meta === 'object' && record.meta !== null
                  ? (record.meta as ResponseEnvelope<T>['meta'])
                  : meta,
            };
          }
        }

        return {
          success: true,
          data: payload,
          meta,
        };
      }),
    );
  }
}
