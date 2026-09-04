import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async logAction(
    action: string,
    actorId?: string,
    entityType?: string,
    entityId?: string,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      const logEntry = this.auditLogRepo.create({
        actor: actorId ? { id: actorId } : undefined,
        action,
        entityType,
        entityId,
        metadata,
        ipAddress,
        userAgent,
      });

      await this.auditLogRepo.save(logEntry);
    } catch (error: unknown) {
      // We log but do not throw. A failing audit log should not crash a checkout,
      // but it must alert infrastructure monitors immediately.
      const err = error as Error;
      this.logger.error(
        `CRITICAL: Failed to write to audit log: ${err.message}`,
        err.stack,
      );
    }
  }
}
