import { Module } from '@nestjs/common';
import { IntegrationModule } from '../integration.module';
import { PaymentWorker } from './payment.worker';

@Module({
  imports: [
    IntegrationModule, // Gives access to PaymentProcessingService
  ],
  providers: [PaymentWorker],
})
export class PaymentWorkerModule {}
