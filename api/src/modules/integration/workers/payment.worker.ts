import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { PaymentProcessingService } from '../services/payment-processing.service';
import type { PaymentJobData } from '../dto/payment-job.dto';

@Processor('payments')
@Injectable()
export class PaymentWorker extends WorkerHost {
  private readonly logger = new Logger(PaymentWorker.name);

  constructor(
    private readonly paymentProcessingService: PaymentProcessingService,
  ) {
    super();
  }

  async process(job: Job<PaymentJobData>): Promise<void> {
    this.logger.log(
      `Worker received payment job ${job.id} from ${job.data.provider}`,
    );

    await this.paymentProcessingService.processFulfillment(job.data);
  }
}
