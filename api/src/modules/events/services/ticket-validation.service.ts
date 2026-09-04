import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { TicketScanAttempt } from '../entities/ticket-scan-attempt.entity';
import { KeyStatus } from '../entities/signing-key.entity';
import { ScanResult } from '../enums/events.enums';
import { SigningKeyService } from './signing-key.service';

export interface ValidationRequest {
  eventId: string;
  deviceId: string;
  gateId: string;
  qrPayload: unknown; // <-- FIX: Strict typing
  signature: string;
}

export interface ValidationResponse {
  result: ScanResult;
  ticketId?: string;
  scannedAt: Date;
}

@Injectable()
export class TicketValidationService {
  private readonly logger = new Logger(TicketValidationService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly signingKeyService: SigningKeyService,
  ) {}

  async validateTicket(
    request: ValidationRequest,
  ): Promise<ValidationResponse> {
    const { eventId, deviceId, gateId, qrPayload, signature } = request;
    const scannedAt = new Date();

    // PHASE 1: Cryptographic Authenticity
    let parsedPayload: Record<string, unknown>;
    let canonicalString = '';

    try {
      const parsed =
        typeof qrPayload === 'string'
          ? (JSON.parse(qrPayload) as unknown)
          : qrPayload;

      // Strict runtime check to guarantee it's a valid object before destructuring
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new Error('Invalid payload format');
      }

      parsedPayload = parsed as Record<string, unknown>;
      canonicalString = JSON.stringify(
        parsedPayload,
        Object.keys(parsedPayload).sort(),
      );
    } catch {
      // <-- FIX: Removed unused 'e' variable binding
      await this.logFailedScan(
        null,
        eventId,
        deviceId,
        gateId,
        ScanResult.INVALID_PAYLOAD,
        qrPayload,
        signature,
      );
      return { result: ScanResult.INVALID_PAYLOAD, scannedAt };
    }

    // Safely extract properties
    const ticketId =
      typeof parsedPayload.t_id === 'string' ? parsedPayload.t_id : null;
    const payloadEventId =
      typeof parsedPayload.e_id === 'string' ? parsedPayload.e_id : null;
    const keyId =
      typeof parsedPayload.k_id === 'string' ? parsedPayload.k_id : null;

    if (!ticketId || !payloadEventId || !keyId) {
      await this.logFailedScan(
        ticketId,
        eventId,
        deviceId,
        gateId,
        ScanResult.INVALID_PAYLOAD,
        parsedPayload,
        signature,
      );
      return { result: ScanResult.INVALID_PAYLOAD, scannedAt };
    }

    if (payloadEventId !== eventId) {
      await this.logFailedScan(
        ticketId,
        eventId,
        deviceId,
        gateId,
        ScanResult.WRONG_EVENT,
        parsedPayload,
        signature,
      );
      return { result: ScanResult.WRONG_EVENT, ticketId, scannedAt };
    }

    const key = await this.signingKeyService.getKeyById(keyId);
    if (!key || key.status === KeyStatus.REVOKED) {
      await this.logFailedScan(
        ticketId,
        eventId,
        deviceId,
        gateId,
        ScanResult.KEY_REVOKED,
        parsedPayload,
        signature,
      );
      return { result: ScanResult.KEY_REVOKED, ticketId, scannedAt };
    }

    const isValidSig = this.signingKeyService.verifySignature(
      canonicalString,
      signature,
      key.publicKey,
    );
    if (!isValidSig) {
      await this.logFailedScan(
        ticketId,
        eventId,
        deviceId,
        gateId,
        ScanResult.INVALID_SIGNATURE,
        parsedPayload,
        signature,
      );
      return { result: ScanResult.INVALID_SIGNATURE, ticketId, scannedAt };
    }

    // PHASE 2: Global Single-Use Enforcement
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ticket = await queryRunner.manager.findOne(Ticket, {
        where: { id: ticketId },
        lock: { mode: 'pessimistic_write' },
      });

      let finalResult: ScanResult;

      if (!ticket) {
        finalResult = ScanResult.NOT_FOUND;
      } else if (ticket.status === TicketStatus.REVOKED) {
        finalResult = ScanResult.REVOKED;
      } else if (ticket.status === TicketStatus.SCANNED) {
        finalResult = ScanResult.DUPLICATE;
      } else {
        finalResult = ScanResult.VALID;
        ticket.status = TicketStatus.SCANNED;
        await queryRunner.manager.save(ticket);
      }

      const attempt = queryRunner.manager.create(TicketScanAttempt, {
        ticketId: ticketId || undefined, // Satisfy optional UUID constraint safely
        eventId,
        deviceId,
        gateId,
        result: finalResult,
        rawPayload: parsedPayload,
        rawSignature: signature,
      });
      await queryRunner.manager.save(attempt);

      await queryRunner.commitTransaction();

      if (finalResult === ScanResult.VALID) {
        this.logger.log(
          `Ticket ${ticketId} successfully validated and consumed at Gate ${gateId}`,
        );
      } else {
        this.logger.warn(
          `Ticket ${ticketId} rejected at Gate ${gateId} - Reason: ${finalResult}`,
        );
      }

      return { result: finalResult, ticketId, scannedAt };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Validation transaction failed for ticket ${ticketId}`,
        error,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async logFailedScan(
    ticketId: string | null,
    eventId: string,
    deviceId: string,
    gateId: string,
    result: ScanResult,
    rawPayload: unknown,
    rawSignature: string,
  ): Promise<void> {
    try {
      const attempt = this.dataSource.manager.create(TicketScanAttempt, {
        ticketId: ticketId || undefined,
        eventId,
        deviceId,
        gateId,
        result,
        rawPayload,
        rawSignature,
      });
      await this.dataSource.manager.save(attempt);
    } catch {
      // <-- FIX: Removed unused 'e' variable binding
      this.logger.error('Failed to write forensic scan log');
    }
  }
}
