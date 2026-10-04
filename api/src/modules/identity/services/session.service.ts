import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Session } from '../entities/session.entity';
import { User } from '../entities/user.entity';

export interface SessionData {
  userId: string;
  email: string;
  sessionId: string;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
  ) {}

  /**
   * Creates a new cryptographically secure session.
   * Returns the raw token (to be sent to the client) and the session record.
   */
  async createSession(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ rawToken: string; session: Session }> {
    // Generate an opaque, high-entropy 256-bit token
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Hash the token for database storage
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    // Set session expiration (e.g., 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = this.sessionRepo.create({
      id: tokenHash,
      user,
      expiresAt,
      ipAddress,
      userAgent,
      isRevoked: false,
    });

    const savedSession = await this.sessionRepo.save(session);

    this.logger.log(`Created new session for user ${user.id}`);

    return { rawToken, session: savedSession };
  }

  /**
   * Validates a raw session token provided by the client.
   * Returns the associated user and session data if valid.
   */
  async validateSession(rawToken: string): Promise<SessionData> {
    if (!rawToken) {
      throw new UnauthorizedException('Session token is missing');
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const session = await this.sessionRepo.findOne({
      where: { id: tokenHash },
      relations: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    if (session.isRevoked) {
      throw new UnauthorizedException('Session has been revoked');
    }

    if (session.expiresAt < new Date()) {
      // FIX: Use JSON.stringify for non-Error objects to prevent [object Object] logs
      this.revokeSession(rawToken).catch((err: unknown) => {
        const errorMessage =
          err instanceof Error ? err.message : JSON.stringify(err);
        this.logger.error(`Failed to cleanup expired session: ${errorMessage}`);
      });
      throw new UnauthorizedException('Session has expired');
    }

    return {
      userId: session.user.id,
      email: session.user.email,
      sessionId: session.id,
    };
  }

  /**
   * Revokes a specific session.
   */
  async revokeSession(rawToken: string): Promise<void> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    await this.sessionRepo.update({ id: tokenHash }, { isRevoked: true });
    this.logger.log(`Revoked session: ${tokenHash}`);
  }

  /**
   * Revokes all active sessions for a user.
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.sessionRepo.update(
      { user: { id: userId }, isRevoked: false },
      { isRevoked: true },
    );
    this.logger.log(`Revoked all sessions for user: ${userId}`);
  }
}
