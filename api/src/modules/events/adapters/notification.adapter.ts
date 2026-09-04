import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface DeliveryPayload {
  destination: string;
  ticketId: string;
  eventName: string;
  qrBuffer: Buffer;
}

export interface INotificationAdapter {
  sendTicket(
    payload: DeliveryPayload,
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

@Injectable()
export class MockEmailAdapter implements INotificationAdapter {
  private readonly logger = new Logger(MockEmailAdapter.name);

  async sendTicket(
    payload: DeliveryPayload,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    this.logger.log(
      `[MOCK SMTP] Transmitting Ticket ${payload.ticketId} to ${payload.destination}`,
    );

    // Simulate network delay to remote provider
    await new Promise((resolve) => setTimeout(resolve, 150));

    return {
      success: true,
      messageId: `mock-resend-${crypto.randomUUID()}`,
    };
  }
}
