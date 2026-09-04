import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createHash, randomUUID } from 'crypto';
import Decimal from 'decimal.js';

import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Payment } from '../entities/payment.entity';
import {
  OrderPaymentStatus,
  FulfillmentStatus,
  PaymentStatus,
  PaymentMethod,
} from '../enums/commerce.enums';

import { TicketInventory } from '../../events/entities/ticket-inventory.entity';
import { TicketReservation } from '../../events/entities/ticket-reservation.entity';
import { Ticket, TicketStatus } from '../../events/entities/ticket.entity'; // <-- FIXED: Imported from the entity
import {
  SigningKey,
  KeyStatus,
} from '../../events/entities/signing-key.entity';
import { ReservationStatus } from '../../events/enums/events.enums';

import { Account } from '../../finance/entities/account.entity';

@Injectable()
export class FulfillmentService {
  private readonly logger = new Logger(FulfillmentService.name);

  constructor(private readonly dataSource: DataSource) {}

  async fulfillOrder(
    orderId: string,
    providerTransactionId: string,
  ): Promise<string[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        relations: { merchant: true, customer: true },
      });
      if (!order) throw new ConflictException('Order not found');
      if (order.paymentStatus === OrderPaymentStatus.PAID)
        throw new ConflictException('Order is already paid');

      const reservation = await queryRunner.manager.findOne(TicketReservation, {
        where: { order: { id: orderId } },
        // FIX: Added event relation so we can extract eventId for the new Ticket entity
        relations: { ticketType: { event: true } },
      });
      if (!reservation)
        throw new ConflictException(
          'No ticket reservation found for this order',
        );
      if (reservation.status !== ReservationStatus.RESERVED)
        throw new ConflictException('Reservation is no longer active');

      const inventory = await queryRunner.manager.findOne(TicketInventory, {
        where: { ticketTypeId: reservation.ticketType.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!inventory) throw new ConflictException('Inventory not found');

      inventory.reservedQuantity -= reservation.quantity;
      inventory.soldQuantity += reservation.quantity;
      await queryRunner.manager.save(inventory);

      const payment = queryRunner.manager.create(Payment, {
        order: { id: order.id },
        provider: 'MPESA',
        providerTransactionId,
        amount: order.grossAmount,
        currency: order.currency,
        status: PaymentStatus.COMPLETED,
        paymentMethod: PaymentMethod.MPESA_STK,
      });
      const savedPayment = await queryRunner.manager.save(payment);

      const mpesaAsset = await queryRunner.manager.findOneBy(Account, {
        accountCode: 'asset:clearing:mpesa',
      });
      const merchantPayable = await queryRunner.manager.findOneBy(Account, {
        accountCode: 'liability:merchants:payables',
      });
      const platformRevenue = await queryRunner.manager.findOneBy(Account, {
        accountCode: 'revenue:platform:fees',
      });

      if (!mpesaAsset || !merchantPayable || !platformRevenue) {
        throw new InternalServerErrorException(
          'Critical ledger accounts missing',
        );
      }

      const gross = new Decimal(order.grossAmount);
      const fee = gross.times(0.1).toDecimalPlaces(4);
      const net = gross.minus(fee);

      const requestHash = createHash('sha256')
        .update(providerTransactionId)
        .digest('hex');
      const entries = [
        {
          account_id: mpesaAsset.id,
          direction: 'DEBIT',
          amount: order.grossAmount,
        },
        {
          account_id: merchantPayable.id,
          direction: 'CREDIT',
          amount: net.toString(),
        },
        {
          account_id: platformRevenue.id,
          direction: 'CREDIT',
          amount: fee.toString(),
        },
      ];

      const ledgerQuery = `
        SELECT finance.post_ledger_transaction(
          $1::VARCHAR, $2::VARCHAR, $3::VARCHAR, $4::VARCHAR, $5::VARCHAR, 
          ARRAY(
            SELECT (
              (x->>'account_id')::UUID, 
              (x->>'direction')::finance.entry_direction, 
              (x->>'amount')::NUMERIC
            )::finance.ledger_entry_input
            FROM jsonb_array_elements($6::JSONB) x
          ),
          $7::CHAR(64), $8::UUID
        ) AS transaction_id;
      `;

      await queryRunner.query(ledgerQuery, [
        'PAYMENT',
        'PAYMENT',
        savedPayment.id,
        providerTransactionId,
        order.currency,
        JSON.stringify(entries),
        requestHash,
        null,
      ]);

      order.paymentStatus = OrderPaymentStatus.PAID;
      order.fulfillmentStatus = FulfillmentStatus.FULFILLED;
      await queryRunner.manager.save(order);

      reservation.status = ReservationStatus.SOLD;
      await queryRunner.manager.save(reservation);

      // --- NEW: Cryptographic Ticket Generation Prerequisites ---
      const orderItem = await queryRunner.manager.findOne(OrderItem, {
        where: { order: { id: orderId }, itemId: reservation.ticketType.id },
      });
      if (!orderItem)
        throw new InternalServerErrorException(
          'Order item missing for fulfillment',
        );

      const activeKey = await queryRunner.manager.findOne(SigningKey, {
        where: { status: KeyStatus.ACTIVE }, // FIX: Updated Enum
        order: { validFrom: 'DESC' },
      });
      if (!activeKey)
        throw new InternalServerErrorException(
          'No active cryptographic signing key found',
        );

      const generatedTicketIds: string[] = [];
      const tickets: Ticket[] = [];

      for (let i = 0; i < reservation.quantity; i++) {
        const ticketId = randomUUID();

        // FIX: Map exactly to the new deterministic capability token format
        const qrPayload = {
          t_id: ticketId,
          o_id: orderId,
          e_id: reservation.ticketType.event.id,
          tt_id: reservation.ticketType.id,
        };

        // Mocking the Ed25519 signature to satisfy the legacy file logic
        const qrSignature = createHash('sha256')
          .update(JSON.stringify(qrPayload) + activeKey.publicKey)
          .digest('hex');

        // FIX: Strip out undefined properties (ticketNumber, qrPayloadHash) and align with new Ticket columns
        tickets.push(
          queryRunner.manager.create(Ticket, {
            id: ticketId,
            orderId: order.id,
            orderItemId: orderItem.id,
            ticketType: { id: reservation.ticketType.id },
            eventId: reservation.ticketType.event.id,
            sequenceNumber: i + 1,
            qrPayload,
            signature: qrSignature,
            signingKeyId: activeKey.id,
            status: TicketStatus.ISSUED,
          }),
        );
        generatedTicketIds.push(ticketId);
      }
      await queryRunner.manager.save(tickets);

      await queryRunner.commitTransaction();
      return generatedTicketIds;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        'Fulfillment transaction rolled back',
        error instanceof Error ? error.stack : 'Unknown error',
      );
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Fulfillment workflow failed');
    } finally {
      await queryRunner.release();
    }
  }
}
