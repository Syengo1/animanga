import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import Decimal from 'decimal.js';
import { randomUUID } from 'crypto';

import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Payment } from '../entities/payment.entity';
import {
  OrderPaymentStatus,
  FulfillmentStatus,
  OrderRefundStatus,
  OrderItemType,
  PaymentStatus,
  PaymentMethod,
} from '../enums/commerce.enums';

import { TicketType } from '../../events/entities/ticket-type.entity';
import { TicketInventory } from '../../events/entities/ticket-inventory.entity';
import { TicketReservation } from '../../events/entities/ticket-reservation.entity';
import {
  ReservationStatus,
  EventStatus,
} from '../../events/enums/events.enums';

import { MpesaService } from '../../integration/services/mpesa.service';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly mpesaService: MpesaService,
  ) {}

  async processCheckout(
    customerId: string,
    ticketTypeId: string,
    quantity: number,
    phoneNumber?: string,
  ): Promise<{
    orderId: string;
    checkoutSessionId: string;
    paymentId: string;
    status: string;
    amount: string;
    currency: string;
    expiresAt: string;
  }> {
    // <-- FIX: Expanded return signature
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ConflictException('Invalid ticket quantity');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let orderId: string;
    let paymentId: string;
    let checkoutSessionId: string = randomUUID();
    let totalGrossStr: string;
    let ticketTypeCurrency: string;
    let reservationExpiry: Date;

    try {
      const ticketType = await queryRunner.manager.findOne(TicketType, {
        where: { id: ticketTypeId },
        relations: { event: { merchant: true } },
      });

      if (!ticketType) throw new ConflictException('Ticket type not found');
      if (ticketType.event.status !== EventStatus.ON_SALE)
        throw new ConflictException('Event is not on sale');
      if (ticketType.salesCutoff && new Date() >= ticketType.salesCutoff)
        throw new ConflictException('Ticket sales closed');

      ticketTypeCurrency = ticketType.currency;

      const inventory = await queryRunner.manager.findOne(TicketInventory, {
        where: { ticketType: { id: ticketTypeId } },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventory || inventory.availableQuantity < quantity) {
        throw new ConflictException('Not enough tickets available');
      }

      const totalGross = new Decimal(ticketType.price)
        .mul(quantity)
        .toDecimalPlaces(4)
        .toFixed(4);
      totalGrossStr = totalGross;

      inventory.availableQuantity -= quantity;
      inventory.reservedQuantity += quantity;
      await queryRunner.manager.save(inventory);

      const order = queryRunner.manager.create(Order, {
        orderNumber: `ORD-${Date.now()}-${randomUUID().slice(0, 4)}`,
        customer: { id: customerId },
        merchant: { id: ticketType.event.merchant.id },
        grossAmount: totalGross,
        currency: ticketType.currency,
        paymentStatus: OrderPaymentStatus.UNPAID,
        fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
        refundStatus: OrderRefundStatus.NOT_REFUNDED,
      });
      const savedOrder = await queryRunner.manager.save(order);
      orderId = savedOrder.id;

      const orderItem = queryRunner.manager.create(OrderItem, {
        order: { id: savedOrder.id },
        itemType: OrderItemType.TICKET,
        itemId: ticketType.id,
        quantity,
        pricePerUnit: ticketType.price,
        currency: ticketType.currency,
      });
      await queryRunner.manager.save(orderItem);

      const payment = queryRunner.manager.create(Payment, {
        order: { id: savedOrder.id },
        amount: totalGrossStr,
        currency: ticketType.currency,
        status: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.MPESA_STK,
        provider: 'DARAJA',
      });
      const savedPayment = await queryRunner.manager.save(payment);
      paymentId = savedPayment.id;

      reservationExpiry = new Date(Date.now() + 15 * 60 * 1000);
      const reservation = queryRunner.manager.create(TicketReservation, {
        ticketType: { id: ticketType.id },
        order: { id: savedOrder.id },
        checkoutSessionId,
        quantity,
        status: ReservationStatus.RESERVED,
        expiresAt: reservationExpiry,
      });
      await queryRunner.manager.save(reservation);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Checkout workflow failed');
    } finally {
      await queryRunner.release();
    }

    if (phoneNumber) {
      try {
        const providerCheckoutId = await this.mpesaService.initiateStkPush(
          paymentId,
          phoneNumber,
          new Decimal(totalGrossStr).toNumber(),
          orderId,
        );
        checkoutSessionId = providerCheckoutId;
      } catch (error: unknown) {
        const err = error as Error;
        this.logger.error(
          `STK Push failed for Order ${orderId}: ${err.message}`,
        );
      }
    }

    // FIX: Explicitly return the fully derived financial state
    return {
      orderId,
      paymentId,
      checkoutSessionId,
      status: 'PENDING',
      amount: totalGrossStr,
      currency: ticketTypeCurrency,
      expiresAt: reservationExpiry.toISOString(),
    };
  }
}
