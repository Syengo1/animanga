import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

import { OrderService } from '../services/order.service';
import { RefundService } from '../services/refund.service';
import { CheckoutService } from '../services/checkout.service'; // <-- Added

import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { UuidSchema } from '../../../common/validation/identifiers.schema';
import { AuthGuard } from '../../../common/guards/auth.guard'; // <-- Added

import {
  CreateRefundSchema,
  CreateRefundInput,
  RequestPayoutSchema,
  RequestPayoutInput,
  CreateMerchantSchema,
  CreateMerchantInput,
} from '../schemas/commerce.schema';

// We need to import the ReserveTicketSchema from Events since Checkout bridges both domains
import {
  ReserveTicketSchema,
  ReserveTicketInput,
} from '../../events/schemas/events.schema';

// Explicitly define the authenticated request shape
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

@UseGuards(AuthGuard) // Protects all commerce endpoints
@Controller('commerce')
export class CommerceController {
  constructor(
    private readonly orderService: OrderService,
    private readonly refundService: RefundService,
    private readonly checkoutService: CheckoutService, // <-- Injected
  ) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async processCheckout(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(ReserveTicketSchema)) body: ReserveTicketInput,
  ) {
    const customerId = request.user.id;

    // Pass the phone number down into the transaction boundary
    const result = await this.checkoutService.processCheckout(
      customerId,
      body.ticketTypeId,
      body.quantity,
      body.phoneNumber,
    );

    return {
      message:
        'Checkout initiated and STK Push sent. Tickets reserved for 15 minutes.',
      orderId: result.orderId,
      checkoutSessionId: result.checkoutSessionId,
    };
  }

  // ... keep the other stubs (merchants, refunds, payouts) intact for now ...
  @Post('merchants')
  createMerchant(
    @Body(new ZodValidationPipe(CreateMerchantSchema))
    body: CreateMerchantInput,
  ) {
    return { message: 'Merchant registered successfully', data: body };
  }

  @Post('orders/:id/refunds')
  @HttpCode(HttpStatus.ACCEPTED)
  requestRefund(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @Body(new ZodValidationPipe(CreateRefundSchema)) body: CreateRefundInput,
  ) {
    return { message: `Refund requested for order ${id}`, data: body };
  }

  @Post('payouts')
  @HttpCode(HttpStatus.ACCEPTED)
  requestPayout(
    @Body(new ZodValidationPipe(RequestPayoutSchema)) body: RequestPayoutInput,
  ) {
    return { message: 'Payout requested securely', data: body };
  }
}
