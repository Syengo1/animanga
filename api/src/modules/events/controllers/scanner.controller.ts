import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiSecurity,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { ScannerGuard } from '../../../common/guards/scanner.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { UuidSchema } from '../../../common/validation/identifiers.schema';
import { AuthenticatedRequest } from '../../../common/interfaces/request.interface';
import {
  ScannerValidationRequestSchema,
  ScannerValidationRequestDto,
  ScannerValidationResponseDto,
} from '../dto/scanner.dto';
import { TicketValidationService } from '../services/ticket-validation.service';
import { ScanResult } from '../enums/events.enums';

@ApiTags('Events - Gate Scanner')
@ApiSecurity('ScannerAuth')
@Controller('events/:eventId/scanner')
@UseGuards(ScannerGuard)
export class ScannerController {
  constructor(private readonly validationService: TicketValidationService) {}

  @Post('validate')
  @ApiOperation({
    summary: 'Validate a cryptographic ticket payload at the gate',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['qrPayload', 'signature'],
      properties: {
        qrPayload: { type: 'object', additionalProperties: true },
        signature: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 201, // 201 because it creates a TicketScanAttempt record
    description: 'Validation result determined.',
    schema: {
      type: 'object',
      properties: {
        result: { type: 'string', example: 'VALID' },
        ticketId: { type: 'string', format: 'uuid', nullable: true },
        ticketType: { type: 'string', nullable: true },
        scannedAt: { type: 'string', format: 'date-time', nullable: true },
        message: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Malformed payload.' })
  @ApiResponse({ status: 401, description: 'Scanner device unauthenticated.' })
  @ApiResponse({
    status: 403,
    description: 'Scanner not authorized for this event.',
  })
  async validateTicket(
    @Req() req: AuthenticatedRequest,
    @Param('eventId', new ZodValidationPipe(UuidSchema)) eventId: string,
    @Body(new ZodValidationPipe(ScannerValidationRequestSchema))
    payload: ScannerValidationRequestDto,
  ): Promise<ScannerValidationResponseDto> {
    const deviceId = req.device?.id;
    const gateId = req.device?.gateId;

    if (!deviceId || !gateId) {
      throw new UnauthorizedException(
        'Scanner device identity or gate assignment is missing',
      );
    }

    const response = await this.validationService.validateTicket({
      eventId,
      deviceId,
      gateId,
      qrPayload: payload.qrPayload,
      signature: payload.signature,
    });

    if (!response.ticketId) {
      return {
        result: response.result as 'INVALID_PAYLOAD' | 'NOT_FOUND',
        message: 'Could not derive ticket identity from payload',
      };
    }

    if (response.result === ScanResult.VALID) {
      return {
        result: 'VALID',
        ticketId: response.ticketId,
        ticketType: 'General Admission',
        scannedAt: response.scannedAt.toISOString(),
      };
    }

    return {
      result: response.result as
        | 'DUPLICATE'
        | 'REVOKED'
        | 'WRONG_EVENT'
        | 'INVALID_SIGNATURE'
        | 'INVALID_PAYLOAD'
        | 'KEY_REVOKED'
        | 'NOT_FOUND',
      message: `Ticket validation failed: ${response.result}`,
      ticketId: response.ticketId,
    };
  }
}
