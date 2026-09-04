import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Merchant } from './entities/merchant.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Payment } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';
import { PayoutRequest } from './entities/payout-request.entity';

import { OrderService } from './services/order.service';
import { PaymentService } from './services/payment.service';
import { RefundService } from './services/refund.service';
import { CheckoutService } from './services/checkout.service';
import { FulfillmentService } from './services/fulfillment.service';

import { CommerceController } from './controllers/commerce.controller';
import { CheckoutController } from './controllers/checkout.controller';

import { FinanceModule } from '../finance/finance.module';
import { IntegrationModule } from '../integration/integration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Merchant,
      Order,
      OrderItem,
      Payment,
      Refund,
      PayoutRequest,
    ]),
    FinanceModule,
    IntegrationModule,
  ],
  controllers: [CommerceController, CheckoutController],
  providers: [
    OrderService,
    PaymentService,
    RefundService,
    CheckoutService,
    FulfillmentService,
  ],
  exports: [
    OrderService,
    PaymentService,
    RefundService,
    CheckoutService,
    FulfillmentService,
  ],
})
export class CommerceModule {}
