import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  requestId: string;
  user?: {
    id: string;
    email: string;
    roles?: string[];
  };
  device?: {
    id: string;
    type: string;
    eventId?: string;
    gateId: string;
  };
}
