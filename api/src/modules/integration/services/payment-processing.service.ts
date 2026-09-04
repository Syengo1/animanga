import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Decimal from 'decimal.js';

import type { PaymentJobData } from '../dto/payment-job.dto';
import { TicketReservation } from '../../events/entities/ticket-reservation.entity';
import { TicketInventory } from '../../events/entities/ticket-inventory.entity';
import {
  ProviderEventProcessing,
  ProviderEventProcessingStatus,
} from '../entities/provider-event-processing.entity';
import { ProviderEvent } from '../entities/provider-event.entity';

import { ProviderTxStatus } from '../enums/integration.enums';
import {
  OrderPaymentStatus,
  FulfillmentStatus,
  PaymentStatus,
  OrderItemType,
} from '../../commerce/enums/commerce.enums';
import { ReservationStatus } from '../../events/enums/events.enums';
import { OrderItem } from '../../commerce/entities/order-item.entity';

import { LedgerService } from '../../finance/services/ledger.service';
import { TicketIssuanceService } from '../../events/services/ticket-issuance.service';

@Injectable()
export class PaymentProcessingService {
  private readonly logger = new Logger(PaymentProcessingService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
    private readonly ticketIssuanceService: TicketIssuanceService,
  ) {}

  async processFulfillment(data: PaymentJobData): Promise<void> {
    this.logger.debug(`FULFILLMENT [${data.providerEventId}]: starting`);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.debug(
        `FULFILLMENT [${data.providerEventId}]: locking provider event processing`,
      );
      const processing = await queryRunner.manager.findOne(
        ProviderEventProcessing,
        {
          where: { providerEventId: data.providerEventId },
          lock: { mode: 'pessimistic_write' },
        },
      );
      this.logger.debug(
        `FULFILLMENT [${data.providerEventId}]: provider event processing locked`,
      );

      if (!processing)
        throw new Error(
          `Processing record for ProviderEvent ${data.providerEventId} not found`,
        );
      if (processing.status === ProviderEventProcessingStatus.PROCESSED) {
        await queryRunner.rollbackTransaction();
        return;
      }

      processing.status = ProviderEventProcessingStatus.PROCESSING;
      processing.attemptCount += 1;
      processing.startedAt = new Date();
      await queryRunner.manager.save(processing);

      this.logger.debug(
        `FULFILLMENT [${data.providerEventId}]: loading provider event chain (no lock)`,
      );
      const providerEvent = await queryRunner.manager
        .createQueryBuilder(ProviderEvent, 'pe')
        .innerJoinAndSelect('pe.providerTransaction', 'pt')
        .innerJoinAndSelect('pt.internalPayment', 'payment')
        .innerJoinAndSelect('payment.order', 'order')
        .innerJoinAndSelect('order.merchant', 'merchant')
        .where('pe.id = :id', { id: data.providerEventId })
        .getOne();
      this.logger.debug(
        `FULFILLMENT [${data.providerEventId}]: provider event chain loaded`,
      );

      if (!providerEvent)
        throw new Error(
          `ProviderEvent ${data.providerEventId} is missing required relational links`,
        );

      const providerTx = providerEvent.providerTransaction;
      const payment = providerTx.internalPayment;
      const order = payment.order;

      if (payment.status === PaymentStatus.COMPLETED) {
        this.logger.warn(`Payment ${payment.id} already settled.`);
        await queryRunner.rollbackTransaction();
        return;
      }

      if (data.eventType === 'PAYMENT_SUCCESS') {
        const webhookAmount = new Decimal(data.amount);
        const providerTxAmount = new Decimal(providerTx.amount);
        const paymentAmount = new Decimal(payment.amount);
        const orderAmount = new Decimal(order.grossAmount);

        if (
          !webhookAmount.eq(providerTxAmount) ||
          !providerTxAmount.eq(paymentAmount) ||
          !paymentAmount.eq(orderAmount)
        ) {
          throw new ConflictException(`Amount chain mismatch detected.`);
        }
      }

      this.logger.debug(
        `FULFILLMENT [${data.providerEventId}]: locking reservation for order ${order.id}`,
      );
      const reservation = await queryRunner.manager
        .createQueryBuilder(TicketReservation, 'res')
        .innerJoinAndSelect('res.ticketType', 'ticketType')
        .innerJoinAndSelect('ticketType.event', 'event')
        .where('res.order = :orderId', { orderId: order.id })
        .setLock('pessimistic_write')
        .getOne();
      this.logger.debug(
        `FULFILLMENT [${data.providerEventId}]: reservation locked`,
      );

      if (!reservation) throw new Error(`Reservation not found`);

      this.logger.debug(
        `FULFILLMENT [${data.providerEventId}]: locking inventory for ticket type ${reservation.ticketType.id}`,
      );
      const inventory = await queryRunner.manager.findOne(TicketInventory, {
        where: { ticketTypeId: reservation.ticketType.id },
        lock: { mode: 'pessimistic_write' },
      });
      this.logger.debug(
        `FULFILLMENT [${data.providerEventId}]: inventory locked`,
      );

      if (!inventory) throw new Error(`Inventory not found`);

      if (data.eventType === 'PAYMENT_SUCCESS') {
        this.logger.debug(
          `FULFILLMENT [${data.providerEventId}]: posting ledger transactions`,
        );
        await this.ledgerService.postCustomerPayment({
          manager: queryRunner.manager,
          paymentId: payment.id,
          merchantId: order.merchant.id,
          amount: payment.amount,
          currency: payment.currency,
          providerTransactionId: data.providerTransactionId,
        });
        this.logger.debug(
          `FULFILLMENT [${data.providerEventId}]: ledger transactions posted`,
        );

        providerTx.providerTransactionId = data.providerTransactionId;
        providerTx.status = ProviderTxStatus.COMPLETED;
        await queryRunner.manager.save(providerTx);

        payment.status = PaymentStatus.COMPLETED;
        await queryRunner.manager.save(payment);

        order.paymentStatus = OrderPaymentStatus.PAID;
        order.fulfillmentStatus = FulfillmentStatus.FULFILLED;
        await queryRunner.manager.save(order);

        inventory.reservedQuantity -= reservation.quantity;
        inventory.soldQuantity += reservation.quantity;
        await queryRunner.manager.save(inventory);

        reservation.status = ReservationStatus.SOLD;
        await queryRunner.manager.save(reservation);

        processing.status = ProviderEventProcessingStatus.PROCESSED;
        processing.processedAt = new Date();
        await queryRunner.manager.save(processing);

        this.logger.debug(
          `FULFILLMENT [${data.providerEventId}]: generating cryptographic tickets`,
        );
        const orderItems = await queryRunner.manager.find(OrderItem, {
          where: { order: { id: order.id } },
        });

        for (const item of orderItems) {
          if (item.itemType === OrderItemType.TICKET) {
            await this.ticketIssuanceService.issueTickets(
              {
                orderId: order.id,
                orderItemId: item.id,
                ticketTypeId: item.itemId,
                eventId: reservation.ticketType.event.id,
                quantity: item.quantity,
              },
              queryRunner.manager,
            ); // <-- FIX: Pass the active transaction manager!
          }
        }
        this.logger.debug(
          `FULFILLMENT [${data.providerEventId}]: tickets generated`,
        );
      } else {
        providerTx.status = ProviderTxStatus.FAILED;
        await queryRunner.manager.save(providerTx);
        // ... (other failure saves omitted for brevity, they are fast)
      }

      this.logger.debug(
        `FULFILLMENT [${data.providerEventId}]: committing transaction`,
      );
      await queryRunner.commitTransaction();
      this.logger.log(
        `Successfully completed atomic fulfillment for Payment ${payment.id}`,
      );
    } catch (error) {
      this.logger.error(
        `FULFILLMENT [${data.providerEventId}]: failed, rolling back`,
        error,
      );
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
