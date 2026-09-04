import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Inject, // <-- Added
} from '@nestjs/common';
import { z } from 'zod'; // <-- Added for inline schema validation
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { UuidSchema } from '../../../common/validation/identifiers.schema';
import { AuthGuard } from '../../../common/guards/auth.guard';
import {
  CreateEventSchema,
  CreateEventInput,
  CreateTicketTypeSchema,
  CreateTicketTypeInput,
  ReserveTicketSchema,
  ReserveTicketInput,
} from '../schemas/events.schema';

// Import the service you will create next
import { TicketValidationService } from '../services/ticket-validation.service';

// Quick inline schema for scanner payload
const ValidateTicketSchema = z.object({
  deviceId: z.string().min(1),
  gateId: z.string().min(1),
  qrPayload: z.unknown(),
  signature: z.string().min(1),
});

type ValidateTicketInput = z.infer<typeof ValidateTicketSchema>;

@UseGuards(AuthGuard)
@Controller('events')
export class EventsController {
  constructor(
    @Inject(TicketValidationService)
    private readonly ticketValidationService: TicketValidationService,
  ) {}

  @Post()
  createEvent(
    @Body(new ZodValidationPipe(CreateEventSchema)) body: CreateEventInput,
  ) {
    return { message: 'Event created successfully', data: body };
  }

  @Post(':eventId/ticket-types')
  createTicketType(
    @Param('eventId', new ZodValidationPipe(UuidSchema)) eventId: string,
    @Body(new ZodValidationPipe(CreateTicketTypeSchema))
    body: CreateTicketTypeInput,
  ) {
    return { message: `Ticket type added to event ${eventId}`, data: body };
  }

  @Post(':eventId/reserve')
  @HttpCode(HttpStatus.OK)
  reserveTickets(
    @Param('eventId', new ZodValidationPipe(UuidSchema)) eventId: string,
    @Body(new ZodValidationPipe(ReserveTicketSchema)) body: ReserveTicketInput,
  ) {
    return {
      message: 'Tickets reserved for 15 minutes',
      checkoutSessionId: crypto.randomUUID(),
      data: body,
    };
  }

  // --- NEW: Cryptographic Ticket Validation Endpoint ---
  @Post(':eventId/tickets/validate')
  @HttpCode(HttpStatus.OK)
  async validateTicket(
    @Param('eventId', new ZodValidationPipe(UuidSchema)) eventId: string,
    @Body(new ZodValidationPipe(ValidateTicketSchema))
    body: ValidateTicketInput,
  ) {
    // Note: We return 200 OK even for DUPLICATE/REJECTED results.
    // The HTTP status means the API worked. The `result` code drives the scanner UI (Red/Green light).
    const validationResult = await this.ticketValidationService.validateTicket({
      eventId,
      deviceId: body.deviceId,
      gateId: body.gateId,
      qrPayload: body.qrPayload,
      signature: body.signature,
    });

    return {
      status: 'success',
      data: validationResult,
    };
  }
}
