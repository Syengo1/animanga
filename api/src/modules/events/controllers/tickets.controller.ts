import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { AuthenticatedRequest } from '../../../common/interfaces/request.interface';
import { TicketWalletListResponseDto } from '../dto/ticket-wallet.dto';
import { TicketService } from '../services/ticket.service';

@ApiTags('Events - Ticket Wallet')
@ApiBearerAuth()
@Controller('tickets')
@UseGuards(AuthGuard)
export class TicketsController {
  constructor(private readonly ticketService: TicketService) {}

  @Get('wallet')
  @ApiOperation({
    summary: "Retrieve the authenticated customer's ticket wallet",
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet retrieved successfully.',
    schema: {
      type: 'object',
      properties: {
        tickets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              ticketNumber: { type: 'string' },
              event: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  title: { type: 'string' },
                  startTime: { type: 'string', format: 'date-time' },
                  venue: { type: 'string' },
                },
              },
              ticketType: { type: 'string' },
              status: { type: 'string' },
              credential: {
                type: 'object',
                properties: {
                  payload: { type: 'object' },
                  signature: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid authentication token.',
  })
  async getWallet(
    @Req() req: AuthenticatedRequest,
  ): Promise<TicketWalletListResponseDto> {
    // FIX: Removed unnecessary non-null assertion (!)
    const customerId = req.user.id;
    const tickets = await this.ticketService.getCustomerWallet(customerId);
    return { tickets };
  }
}
