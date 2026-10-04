import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from '../services/email.service';
import { EmailJobData } from '../dto/email-job.dto';

@Processor('email-queue')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    this.logger.log(`Processing job ${job.id}: ${job.name}`);

    const { eventType, payload, deduplicationKey } = job.data;

    switch (eventType) {
      case 'USER_REGISTERED':
        await this.emailService.sendVerificationEmail(
          payload.email,
          payload.verificationToken,
          deduplicationKey,
        );
        break;

      case 'USER_ACTIVATED':
        // FIX: Removed the stub and wired the real method
        await this.emailService.sendWelcomeEmail(
          payload.email,
          payload.username, // Using the username we passed into the outbox
          deduplicationKey,
        );
        break;

      default: {
        const _exhaustiveCheck: never = eventType;
        this.logger.warn(
          `Unknown email event type skipped: ${_exhaustiveCheck as string}`,
        );
        break;
      }
    }
  }
}
