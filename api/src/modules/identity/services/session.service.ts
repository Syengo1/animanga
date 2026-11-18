// C:\Projects\animanga-platform\api\src\modules\identity\services\session.service.ts
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { isIP } from 'net';
import { Session } from '../entities/session.entity';
import { User, UserStatus } from '../entities/user.entity';

export interface SessionData {
  userId: string;
  email: string;
  sessionId: string;
}

const SESSION_TOKEN_REGEX = /^[a-f0-9]{64}$/i;
const SESSION_TTL_DAYS = 7;
const MAX_USER_AGENT_LENGTH = 512;

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
  ) {}

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }

  /**
   * Sanitizes proxy/Express IP strings so PostgreSQL's `inet` column type
   * never throws a syntax error on comma-separated lists or port suffixes.
   */
  private sanitizeIpAddress(rawIp?: string): string | undefined {
    if (!rawIp || typeof rawIp !== 'string') return undefined;

    const firstHop = rawIp.split(',')[0]?.trim() || '';
    if (!firstHop) return undefined;

    // Strip IPv6 zone index (e.g., fe80::1%lo0) if present
    const withoutZone = firstHop.split('%')[0] || '';

    if (isIP(withoutZone) !== 0) {
      return withoutZone;
    }

    // Handle IPv4 with port (e.g., 127.0.0.1:54321)
    const ipv4Match = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(withoutZone);
    if (ipv4Match && isIP(ipv4Match[1]) === 4) {
      return ipv4Match[1];
    }

    return undefined;
  }

  private sanitizeUserAgent(rawUa?: string): string | undefined {
    if (!rawUa || typeof rawUa !== 'string') return undefined;
    const trimmed = rawUa.trim();
    return trimmed ? trimmed.slice(0, MAX_USER_AGENT_LENGTH) : undefined;
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Creates a new cryptographically secure 256-bit session.
   * Stores only the SHA-256 digest in PostgreSQL and returns the raw token.
   */
  async createSession(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ rawToken: string; session: Session }> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date(
      Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    const session = this.sessionRepo.create({
      id: tokenHash,
      user,
      expiresAt,
      ipAddress: this.sanitizeIpAddress(ipAddress),
      userAgent: this.sanitizeUserAgent(userAgent),
      isRevoked: false,
    });

    const savedSession = await this.sessionRepo.save(session);
    this.logger.log(`Created new session for user ${user.id}`);

    return { rawToken, session: savedSession };
  }

  /**
   * Validates a raw session token against the database, enforcing format,
   * revocation, expiration, and active user status invariants.
   */
  async validateSession(rawToken: string): Promise<SessionData> {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new UnauthorizedException('Session token is missing');
    }

    const normalizedToken = rawToken.trim();
    if (!SESSION_TOKEN_REGEX.test(normalizedToken)) {
      throw new UnauthorizedException('Invalid session');
    }

    const tokenHash = this.hashToken(normalizedToken);

    const session = await this.sessionRepo.findOne({
      where: { id: tokenHash },
      relations: { user: true },
    });

    if (!session || !session.user) {
      throw new UnauthorizedException('Invalid session');
    }

    if (session.isRevoked) {
      throw new UnauthorizedException('Session has been revoked');
    }

    if (session.expiresAt < new Date()) {
      this.revokeSession(normalizedToken).catch((err: unknown) => {
        this.logger.error(
          `Failed to cleanup expired session: ${this.formatError(err)}`,
        );
      });
      throw new UnauthorizedException('Session has expired');
    }

    if (session.user.status !== UserStatus.ACTIVE) {
      this.revokeSession(normalizedToken).catch((err: unknown) => {
        this.logger.error(
          `Failed to revoke session for non-active user: ${this.formatError(err)}`,
        );
      });
      throw new UnauthorizedException(
        'This account is suspended or not active',
      );
    }

    return {
      userId: session.user.id,
      email: session.user.email,
      sessionId: session.id,
    };
  }

  /**
   * Revokes a specific session by its raw token.
   */
  async revokeSession(rawToken: string): Promise<void> {
    if (!rawToken || typeof rawToken !== 'string') return;
    const normalizedToken = rawToken.trim();
    if (!SESSION_TOKEN_REGEX.test(normalizedToken)) return;

    const tokenHash = this.hashToken(normalizedToken);
    await this.sessionRepo.update({ id: tokenHash }, { isRevoked: true });
    this.logger.log(`Revoked session: ${tokenHash.slice(0, 12)}...`);
  }

  /**
   * Revokes all active sessions for a user (e.g., on password reset or suspension).
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.sessionRepo.update(
      { user: { id: userId }, isRevoked: false },
      { isRevoked: true },
    );
    this.logger.log(`Revoked all sessions for user: ${userId}`);
  }
}
