import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { TicketDeliveryJobData } from '../dto/ticket-delivery.dto';
import { TicketDeliveryService } from '../services/ticket-delivery.service';

@Processor('ticket-delivery', {
  concurrency: 5,
})
export class TicketDeliveryWorker extends WorkerHost {
  private readonly logger = new Logger(TicketDeliveryWorker.name);

  constructor(private readonly ticketDeliveryService: TicketDeliveryService) {
    super();
  }

  async process(job: Job<TicketDeliveryJobData>): Promise<void> {
    this.logger.debug(
      `Picked up delivery job ${job.id} for Ticket ${job.data.ticketId}`,
    );

    // Hand off opaque payload to the business domain
    await this.ticketDeliveryService.deliver(job.data);
  }
}
