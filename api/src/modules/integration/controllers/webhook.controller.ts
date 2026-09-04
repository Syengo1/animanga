import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { WebhookService } from '../services/webhook.service';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';

import {
  DarajaStkCallbackSchema,
  DarajaStkCallback,
} from '../schemas/daraja-callback.schema';
import { DarajaAdapter } from '../adapters/daraja.adapter';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly darajaAdapter: DarajaAdapter,
    private readonly webhookService: WebhookService,
  ) {}

  @Post('daraja/stk')
  @HttpCode(HttpStatus.OK)
  async handleDarajaStkCallback(
    @Body(new ZodValidationPipe(DarajaStkCallbackSchema))
    body: DarajaStkCallback,
  ) {
    const checkoutRequestId = body.Body.stkCallback.CheckoutRequestID;
    this.logger.log(
      `Received STK Push Callback for CheckoutRequestID: ${checkoutRequestId}`,
    );

    // 1. Normalize the Daraja-specific payload into our Canonical format
    const canonicalEvent = this.darajaAdapter.normalizeStkCallback(body);

    try {
      // 2. Persist to Inbox & Queue for async processing
      await this.webhookService.processIncomingWebhook(canonicalEvent);
    } catch (error) {
      // 3. Gracefully absorb duplicate callbacks (Idempotency)
      if (error instanceof ConflictException) {
        this.logger.warn(
          `Absorbed duplicate callback for ${checkoutRequestId}. Acknowledging Daraja.`,
        );
      } else {
        // Re-throw unexpected database/queue failures so Daraja retries later
        throw error;
      }
    }

    // 4. Return Safaricom's explicit required acknowledgement structure
    return {
      ResultCode: 0,
      ResultDesc: 'Accepted',
    };
  }
}
