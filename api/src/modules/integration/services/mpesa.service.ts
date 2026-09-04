import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { ProviderTransaction } from '../entities/provider-transaction.entity';
import { ProviderTxStatus } from '../enums/integration.enums';
import { DarajaAdapter } from '../adapters/daraja.adapter';

@Injectable()
export class MpesaService {
  private readonly logger = new Logger(MpesaService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly darajaAdapter: DarajaAdapter,
  ) {}

  async initiateStkPush(
    paymentId: string,
    phoneNumber: string,
    amount: number,
    orderId: string,
  ): Promise<string> {
    // 1. Trigger the external API safely abstracted in the adapter
    const response = await this.darajaAdapter.sendStkPush(
      phoneNumber,
      amount,
      orderId,
    );

    // 2. Save the external intent to our database so the webhook can find it
    const providerTx = this.dataSource
      .getRepository(ProviderTransaction)
      .create({
        provider: 'DARAJA',
        providerTransactionId: response.CheckoutRequestID,
        internalPayment: { id: paymentId },
        amount: amount.toString(),
        currency: 'KES',
        status: ProviderTxStatus.INITIATED,
      });

    await this.dataSource.getRepository(ProviderTransaction).save(providerTx);

    return response.CheckoutRequestID;
  }
}
