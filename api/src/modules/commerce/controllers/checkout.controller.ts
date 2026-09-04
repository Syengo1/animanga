import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import {
  CheckoutRequestSchema,
  CheckoutRequestDto,
  CheckoutResponseDto,
} from '../dto/checkout.dto';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CheckoutService } from '../services/checkout.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { AuthenticatedRequest } from '../../../common/interfaces/request.interface';

@ApiTags('Commerce - Checkout')
@ApiBearerAuth()
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Initiate a ticket purchase and M-Pesa STK Push' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['ticketTypeId', 'quantity', 'phoneNumber'],
      properties: {
        ticketTypeId: { type: 'string', format: 'uuid' },
        quantity: { type: 'integer', minimum: 1, maximum: 10 },
        phoneNumber: { type: 'string', example: '254712345678' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout initiated, STK Push sent.',
    schema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', format: 'uuid' },
        paymentId: { type: 'string', format: 'uuid' },
        checkoutSessionId: { type: 'string' },
        status: { type: 'string', example: 'PENDING' },
        amount: { type: 'string', example: '3000.0000' },
        currency: { type: 'string', example: 'KES' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed (e.g., invalid phone format).',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid authentication token.',
  })
  @ApiResponse({ status: 409, description: 'Insufficient ticket inventory.' })
  async checkout(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(CheckoutRequestSchema))
    payload: CheckoutRequestDto,
  ): Promise<CheckoutResponseDto> {
    const result = await this.checkoutService.processCheckout(
      req.user.id, // FIX: Removed unnecessary non-null assertion (!)
      payload.ticketTypeId,
      payload.quantity,
      payload.phoneNumber,
    );

    return {
      orderId: result.orderId,
      paymentId: result.paymentId,
      checkoutSessionId: result.checkoutSessionId,
      status: 'PENDING', // FIX: Assigned literal directly to avoid assertion warnings
      amount: result.amount,
      currency: 'KES', // FIX: Assigned literal directly to avoid assertion warnings
      expiresAt: result.expiresAt,
    };
  }
}
