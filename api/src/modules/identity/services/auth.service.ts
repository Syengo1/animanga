// C:\Projects\animanga-platform\api\src\modules\identity\services\auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

import { User, UserStatus } from '../entities/user.entity';
import { PasswordCredential } from '../entities/password-credential.entity';
import { EmailVerificationToken } from '../entities/email-verification-token.entity';
import {
  ExternalIdentity,
  IdentityProvider,
} from '../entities/external-identity.entity';
import { OutboxMessage } from '../../integration/entities/outbox-message.entity';
import { OutboxStatus } from '../../integration/enums/integration.enums';
import {
  RegisterInput,
  LoginInput,
  GoogleAuthInput,
} from '../schemas/auth.schema';
import { SessionService } from './session.service';
import { EmailService } from '../../integration/services/email.service';

export interface RegisterResult {
  id: string;
  username: string;
  email: string;
  verificationContextToken: string;
  message: string;
}

export interface VerifyEmailResult {
  success: boolean;
  message: string;
}

export interface LoginResult {
  sessionToken: string;
  id: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
}

export interface GoogleLoginResult {
  sessionToken: string;
  user: User;
  roles: string[];
  permissions: string[];
}

export interface RegistrationStatusResult {
  status: UserStatus;
  email: string;
  username: string;
  emailVerifiedAt: string | null;
  registeredAt: string;
  message: string;
}

export interface ResendVerificationResult {
  email: string;
  message: string;
}

interface VerificationContextPayload {
  uid: string;
  email: string;
  exp: number;
}

const DUMMY_ARGON2_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$YW5pbWFuZ2Ffc2FsdF8xNg$YW5pbWFuZ2FfZHVtbXlfaGFzaF8zMl9ieXRlc19rZXk';

const RESEND_COOLDOWN_MS = 45 * 1000;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const CONTEXT_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const OUTBOX_FAST_PATH_GRACE_MS = 15 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  // Per-boot fallback secret if AUTH_CONTEXT_SECRET is not set in .env
  private readonly contextSecret =
    process.env.AUTH_CONTEXT_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    'animanga-verification-context-secret-key';

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly sessionService: SessionService,
    private readonly emailService: EmailService,
  ) {}

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.stack || error.message;
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

  private isTransientDbError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const msg = error.message.toLowerCase();
    return (
      msg.includes('connection terminated unexpectedly') ||
      msg.includes('connection reset') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      msg.includes('client has encountered a connection error')
    );
  }

  /**
   * Transparently retries a database operation once if the cloud pooler
   * severed an idle socket right before the request arrived.
   */
  private async withDbRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      if (this.isTransientDbError(error)) {
        this.logger.warn(
          'Transient DB socket reset detected in AuthService; retrying on a fresh connection...',
        );
        await new Promise((resolve) => setTimeout(resolve, 150));
        return await operation();
      }
      throw error;
    }
  }

  private isPgUniqueViolation(
    error: unknown,
  ): error is { code: string; detail?: string; constraint?: string } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === '23505'
    );
  }

  /**
   * Issues a short-lived HMAC-SHA256 signed token proving the caller either
   * just created this account or authenticated with its valid password.
   */
  private createVerificationContextToken(
    userId: string,
    email: string,
  ): string {
    const payload: VerificationContextPayload = {
      uid: userId,
      email: email.toLowerCase(),
      exp: Date.now() + CONTEXT_TOKEN_TTL_MS,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.contextSecret)
      .update(encoded)
      .digest('base64url');
    return `${encoded}.${signature}`;
  }

  private verifyContextToken(token: string): VerificationContextPayload {
    const parts = token.trim().split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new UnauthorizedException('Invalid verification session token');
    }

    const [encoded, providedSig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.contextSecret)
      .update(encoded)
      .digest('base64url');

    const providedBuf = Buffer.from(providedSig);
    const expectedBuf = Buffer.from(expectedSig);

    if (
      providedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
      throw new UnauthorizedException('Invalid verification session signature');
    }

    try {
      const parsed = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8'),
      ) as VerificationContextPayload;

      if (!parsed.uid || !parsed.email || Date.now() > parsed.exp) {
        throw new UnauthorizedException('Verification status session expired');
      }

      return parsed;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Malformed verification session token');
    }
  }

  private extractRolesAndPermissions(user: User): {
    roles: string[];
    permissions: string[];
  } {
    const assignments = user.roleAssignments || [];
    const roles = Array.from(
      new Set(
        assignments
          .map((ra) => ra.role?.code)
          .filter((code): code is string => Boolean(code)),
      ),
    );
    const permissions = Array.from(
      new Set(
        assignments.flatMap((ra) =>
          (ra.role?.permissions || []).map((p) => p.code),
        ),
      ),
    );
    return { roles, permissions };
  }

  private async generateAvailableSuggestions(base: string): Promise<string[]> {
    const cleanBase = base
      .replace(/[^a-zA-Z0-9_]/g, '')
      .slice(0, 20)
      .toLowerCase();
    const prefix = cleanBase.length >= 3 ? cleanBase : `user_${cleanBase}`;

    const candidates = [
      `${prefix}_official`,
      `${prefix}_real`,
      `${prefix}${new Date().getFullYear()}`,
      `${prefix}_${crypto.randomInt(100, 999)}`,
      `${prefix}${crypto.randomInt(10, 99)}`,
    ];

    const takenUsers = await this.withDbRetry(() =>
      this.userRepo.find({
        where: { username: In(candidates) },
        select: { username: true },
      }),
    );

    const takenSet = new Set(takenUsers.map((u) => u.username));
    return candidates.filter((c) => !takenSet.has(c)).slice(0, 4);
  }

  async register(input: RegisterInput): Promise<RegisterResult> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const emailExists = await this.withDbRetry(() =>
      this.userRepo.exists({
        where: { email: normalizedEmail },
      }),
    );

    if (emailExists) {
      throw new ConflictException('Email is already registered');
    }

    let finalUsername = input.username?.trim();

    if (!finalUsername) {
      finalUsername = `user_${crypto.randomBytes(4).toString('hex')}`;
    } else {
      const usernameExists = await this.withDbRetry(() =>
        this.userRepo.exists({
          where: { username: finalUsername },
        }),
      );

      if (usernameExists) {
        const suggestions =
          await this.generateAvailableSuggestions(finalUsername);
        throw new ConflictException({
          message: 'Username is already taken',
          suggestions,
        });
      }
    }

    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      timeCost: 2,
      memoryCost: 19 * 1024,
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedUser: User;

    try {
      const user = queryRunner.manager.create(User, {
        email: normalizedEmail,
        username: finalUsername,
        firstName: input.firstName?.trim() || undefined,
        lastName: input.lastName?.trim() || undefined,
        status: UserStatus.PENDING_EMAIL_VERIFICATION,
      });
      savedUser = await queryRunner.manager.save(user);

      const credential = queryRunner.manager.create(PasswordCredential, {
        userId: savedUser.id,
        passwordHash,
      });
      await queryRunner.manager.save(credential);

      const verificationToken = queryRunner.manager.create(
        EmailVerificationToken,
        {
          user: { id: savedUser.id },
          tokenHash,
          expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
        },
      );
      await queryRunner.manager.save(verificationToken);

      const dedupKey = `verify:email:${savedUser.id}`;
      const outboxMsg = queryRunner.manager.create(OutboxMessage, {
        aggregateType: 'USER',
        aggregateId: savedUser.id,
        eventType: 'USER_REGISTERED',
        payload: {
          email: savedUser.email,
          username: savedUser.username,
          verificationToken: rawToken,
        },
        status: OutboxStatus.PENDING,
        deduplicationKey: dedupKey,
        nextAttemptAt: new Date(Date.now() + OUTBOX_FAST_PATH_GRACE_MS),
      });
      await queryRunner.manager.save(outboxMsg);

      await queryRunner.commitTransaction();

      this.emailService
        .sendVerificationEmail(savedUser.email, rawToken, dedupKey)
        .then(() =>
          this.dataSource.query(
            `UPDATE integration.outbox_messages SET status = $1, published_at = NOW() WHERE deduplication_key = $2`,
            [OutboxStatus.PUBLISHED, dedupKey],
          ),
        )
        .catch((err: unknown) => {
          this.logger.warn(
            `Immediate email send deferred to Outbox worker: ${this.formatError(err)}`,
          );
        });
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();

      if (this.isPgUniqueViolation(error)) {
        throw new ConflictException(
          'Email or username is already registered. Please try again.',
        );
      }

      this.logger.error(
        'Registration transaction failed',
        this.formatError(error),
      );
      throw new InternalServerErrorException('Failed to process registration');
    } finally {
      await queryRunner.release();
    }

    const verificationContextToken = this.createVerificationContextToken(
      savedUser.id,
      savedUser.email,
    );

    return {
      id: savedUser.id,
      username: savedUser.username,
      email: savedUser.email,
      verificationContextToken,
      message:
        'Registration initiated. Please check your email to verify your account.',
    };
  }

  async verifyEmail(rawToken: string): Promise<VerifyEmailResult> {
    if (!rawToken || !/^[a-f0-9]{64}$/i.test(rawToken.trim())) {
      throw new BadRequestException({
        code: 'VERIFICATION_TOKEN_INVALID',
        message: 'Invalid verification token',
      });
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken.trim())
      .digest('hex');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let verifiedEmail = '';
    let verifiedUsername = '';
    let welcomeDedupKey = '';

    try {
      const verificationRecord = await queryRunner.manager.findOne(
        EmailVerificationToken,
        {
          where: { tokenHash },
          relations: { user: true },
          lock: { mode: 'pessimistic_write' },
        },
      );

      if (!verificationRecord || !verificationRecord.user) {
        throw new BadRequestException({
          code: 'VERIFICATION_TOKEN_INVALID',
          message: 'Invalid verification token',
        });
      }

      if (verificationRecord.usedAt) {
        throw new BadRequestException({
          code: 'VERIFICATION_TOKEN_ALREADY_USED',
          message: 'This verification link has already been used',
        });
      }

      if (verificationRecord.expiresAt < new Date()) {
        throw new BadRequestException({
          code: 'VERIFICATION_TOKEN_EXPIRED',
          message: 'Verification token has expired',
        });
      }

      await queryRunner.manager.query(
        `UPDATE identity.email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
        [verificationRecord.user.id],
      );

      verificationRecord.user.status = UserStatus.ACTIVE;
      verificationRecord.user.emailVerifiedAt = new Date();
      await queryRunner.manager.save(verificationRecord.user);

      verifiedEmail = verificationRecord.user.email;
      verifiedUsername = verificationRecord.user.username;
      welcomeDedupKey = `welcome:email:${verificationRecord.user.id}`;

      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(OutboxMessage)
        .values({
          aggregateType: 'USER',
          aggregateId: verificationRecord.user.id,
          eventType: 'USER_ACTIVATED',
          payload: {
            email: verifiedEmail,
            username: verifiedUsername,
          },
          status: OutboxStatus.PENDING,
          deduplicationKey: welcomeDedupKey,
          nextAttemptAt: new Date(Date.now() + OUTBOX_FAST_PATH_GRACE_MS),
        })
        .orIgnore()
        .execute();

      await queryRunner.commitTransaction();

      this.emailService
        .sendWelcomeEmail(verifiedEmail, verifiedUsername, welcomeDedupKey)
        .then(() =>
          this.dataSource.query(
            `UPDATE integration.outbox_messages SET status = $1, published_at = NOW() WHERE deduplication_key = $2`,
            [OutboxStatus.PUBLISHED, welcomeDedupKey],
          ),
        )
        .catch((err: unknown) => {
          this.logger.warn(
            `Welcome email deferred to Outbox worker: ${this.formatError(err)}`,
          );
        });

      return { success: true, message: 'Email successfully verified' };
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      if (error instanceof BadRequestException) throw error;

      this.logger.error('Email verification failed', this.formatError(error));
      throw new InternalServerErrorException('Failed to verify email');
    } finally {
      await queryRunner.release();
    }
  }

  async login(
    input: LoginInput,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const user = await this.withDbRetry(() =>
      this.userRepo.findOne({
        where: { email: normalizedEmail },
        relations: {
          passwordCredential: true,
          roleAssignments: {
            role: {
              permissions: true,
            },
          },
        },
      }),
    );

    const targetHash =
      user?.passwordCredential?.passwordHash || DUMMY_ARGON2_HASH;
    let isPasswordValid = false;

    try {
      isPasswordValid = await argon2.verify(targetHash, input.password);
    } catch {
      isPasswordValid = false;
    }

    if (!user || !user.passwordCredential || !isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Because password verification succeeded above, the caller has proven ownership
    // of this account. Issue a signed verificationContextToken so they can view status.
    if (user.status === UserStatus.PENDING_EMAIL_VERIFICATION) {
      const verificationContextToken = this.createVerificationContextToken(
        user.id,
        user.email,
      );
      throw new UnauthorizedException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before logging in.',
        verificationContextToken,
      });
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account is suspended or disabled.');
    }

    const { rawToken } = await this.sessionService.createSession(
      user,
      ipAddress,
      userAgent,
    );

    const { roles, permissions } = this.extractRolesAndPermissions(user);

    return {
      sessionToken: rawToken,
      id: user.id,
      email: user.email,
      username: user.username,
      roles,
      permissions,
    };
  }

  // ====================================================================
  // F03.0 & F03.1: GOOGLE IDENTITY SERVICES
  // ====================================================================

  private async verifyGoogleCode(code: string, redirectUri: string) {
    try {
      const { tokens } = await this.googleClient.getToken({
        code,
        redirect_uri: redirectUri,
      });

      if (!tokens.id_token) {
        throw new Error('Missing id_token in Google response');
      }

      const ticket = await this.googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      return ticket.getPayload();
    } catch (error: unknown) {
      this.logger.error(
        'Google token exchange failed',
        this.formatError(error),
      );
      throw new UnauthorizedException(
        'Invalid or expired Google authorization code',
      );
    }
  }

  async googleLogin(
    input: GoogleAuthInput,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<GoogleLoginResult> {
    const payload = await this.verifyGoogleCode(input.code, input.redirectUri);

    if (!payload?.sub || !payload?.email) {
      throw new UnauthorizedException('Incomplete Google profile returned');
    }

    if (!payload.email_verified) {
      throw new UnauthorizedException(
        'Your Google account email must be verified to sign in.',
      );
    }

    const sub = payload.sub;
    const normalizedEmail = payload.email.trim().toLowerCase();
    const givenName = payload.given_name;
    const familyName = payload.family_name;

    // CASE 1: Returning Google User (with transient DB retry for idle pool sockets)
    const existingIdentity = await this.withDbRetry(() =>
      this.dataSource.manager.findOne(ExternalIdentity, {
        where: { provider: IdentityProvider.GOOGLE, providerSubject: sub },
        relations: {
          user: {
            roleAssignments: {
              role: {
                permissions: true,
              },
            },
          },
        },
      }),
    );

    if (existingIdentity) {
      if (existingIdentity.user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException(
          'This account is suspended or disabled.',
        );
      }
      const { rawToken } = await this.sessionService.createSession(
        existingIdentity.user,
        ipAddress,
        userAgent,
      );
      const { roles, permissions } = this.extractRolesAndPermissions(
        existingIdentity.user,
      );
      return {
        sessionToken: rawToken,
        user: existingIdentity.user,
        roles,
        permissions,
      };
    }

    // CASE 2: Existing User with the same verified email -> Auto-link or conflict
    const existingUser = await this.withDbRetry(() =>
      this.userRepo.findOne({
        where: { email: normalizedEmail },
      }),
    );
    if (existingUser) {
      throw new ConflictException({
        code: 'ACCOUNT_EXISTS',
        message:
          'An account with this email already exists. Please log in with your password and link your Google account in settings.',
      });
    }

    // CASE 3: Brand New Google User
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedUser: User;
    try {
      const rawPrefix = normalizedEmail
        .split('@')[0]
        .replace(/[^a-zA-Z0-9_]/g, '')
        .slice(0, 20);
      let baseUsername =
        rawPrefix.length >= 3
          ? rawPrefix
          : `user_${crypto.randomBytes(3).toString('hex')}`;

      const exists = await queryRunner.manager.exists(User, {
        where: { username: baseUsername },
      });
      if (exists) {
        baseUsername = `${baseUsername}_${crypto.randomBytes(4).toString('hex')}`;
      }

      const user = queryRunner.manager.create(User, {
        email: normalizedEmail,
        username: baseUsername,
        firstName: givenName,
        lastName: familyName,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      });
      savedUser = await queryRunner.manager.save(user);

      const externalIdentity = queryRunner.manager.create(ExternalIdentity, {
        user: { id: savedUser.id },
        provider: IdentityProvider.GOOGLE,
        providerSubject: sub,
        providerEmail: normalizedEmail,
      });
      await queryRunner.manager.save(externalIdentity);

      const welcomeDedupKey = `welcome:email:${savedUser.id}`;
      const outboxMsg = queryRunner.manager.create(OutboxMessage, {
        aggregateType: 'USER',
        aggregateId: savedUser.id,
        eventType: 'USER_ACTIVATED',
        payload: { email: savedUser.email, username: savedUser.username },
        status: OutboxStatus.PENDING,
        deduplicationKey: welcomeDedupKey,
        nextAttemptAt: new Date(Date.now() + OUTBOX_FAST_PATH_GRACE_MS),
      });
      await queryRunner.manager.save(outboxMsg);

      await queryRunner.commitTransaction();

      this.emailService
        .sendWelcomeEmail(savedUser.email, savedUser.username, welcomeDedupKey)
        .then(() =>
          this.dataSource.query(
            `UPDATE integration.outbox_messages SET status = $1, published_at = NOW() WHERE deduplication_key = $2`,
            [OutboxStatus.PUBLISHED, welcomeDedupKey],
          ),
        )
        .catch((err: unknown) => {
          this.logger.warn(
            `Google welcome email deferred to Outbox worker: ${this.formatError(err)}`,
          );
        });
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();

      if (this.isPgUniqueViolation(error)) {
        throw new ConflictException(
          'Account already exists or is being provisioned. Please sign in again.',
        );
      }

      this.logger.error(
        'Failed to provision Google account',
        this.formatError(error),
      );
      throw new InternalServerErrorException(
        'Failed to process Google sign-in',
      );
    } finally {
      await queryRunner.release();
    }

    const { rawToken } = await this.sessionService.createSession(
      savedUser,
      ipAddress,
      userAgent,
    );
    return {
      sessionToken: rawToken,
      user: savedUser,
      roles: [],
      permissions: [],
    };
  }

  async linkGoogleAccount(
    userId: string,
    input: GoogleAuthInput,
  ): Promise<{ success: boolean; message: string }> {
    const payload = await this.verifyGoogleCode(input.code, input.redirectUri);

    if (!payload?.sub || !payload?.email || !payload.email_verified) {
      throw new UnauthorizedException(
        'A verified Google account is required for linking',
      );
    }

    const { sub, email } = payload;
    const normalizedEmail = email.trim().toLowerCase();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingIdentity = await queryRunner.manager.findOne(
        ExternalIdentity,
        {
          where: { provider: IdentityProvider.GOOGLE, providerSubject: sub },
          relations: { user: true },
        },
      );

      if (existingIdentity) {
        if (existingIdentity.user.id === userId) {
          throw new ConflictException(
            'This Google account is already linked to your profile',
          );
        }
        throw new ConflictException(
          'This Google account is linked to a different user',
        );
      }

      const conflictingEmailOwner = await queryRunner.manager.findOne(User, {
        where: { email: normalizedEmail },
        select: { id: true },
      });

      if (conflictingEmailOwner && conflictingEmailOwner.id !== userId) {
        throw new ConflictException(
          'This Google email address is already registered to another Animanga account',
        );
      }

      const externalIdentity = queryRunner.manager.create(ExternalIdentity, {
        user: { id: userId },
        provider: IdentityProvider.GOOGLE,
        providerSubject: sub,
        providerEmail: normalizedEmail,
      });

      await queryRunner.manager.save(externalIdentity);
      await queryRunner.commitTransaction();

      return { success: true, message: 'Google account linked successfully' };
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ConflictException) throw error;
      if (this.isPgUniqueViolation(error)) {
        throw new ConflictException(
          'This Google account is already linked to a profile',
        );
      }
      this.logger.error(
        'Failed to link Google account',
        this.formatError(error),
      );
      throw new InternalServerErrorException('Failed to link Google account');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * SECURE STATUS CHECK (Zero Enumeration):
   * Requires a cryptographically signed `contextToken` issued either during
   * registration or after verifying the user's password during login.
   */
  async getVerificationStatusByToken(
    contextToken: string,
  ): Promise<RegistrationStatusResult> {
    const claims = this.verifyContextToken(contextToken);

    const user = await this.withDbRetry(() =>
      this.userRepo.findOne({
        where: { id: claims.uid, email: claims.email },
        select: {
          id: true,
          email: true,
          username: true,
          status: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      }),
    );

    if (!user) {
      throw new UnauthorizedException(
        'Verification session is no longer valid',
      );
    }

    return {
      status: user.status,
      email: user.email,
      username: user.username,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      registeredAt: user.createdAt.toISOString(),
      message:
        user.status === UserStatus.ACTIVE
          ? 'Your account is verified and active. You can sign in now.'
          : 'Your account is awaiting email verification. Please check your inbox and spam folder.',
    };
  }

  /**
   * ZERO-ENUMERATION RESEND:
   * Always returns an identical 200 OK response regardless of whether the email
   * exists, is already verified, or is pending verification.
   */
  async resendVerificationEmail(
    rawEmail: string,
  ): Promise<ResendVerificationResult> {
    const email = rawEmail?.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      throw new BadRequestException('A valid email address is required');
    }

    const uniformResponse: ResendVerificationResult = {
      email,
      message:
        'If an unverified account is associated with this email, a fresh activation link has been sent. Please check your inbox and spam folder.',
    };

    const user = await this.withDbRetry(() =>
      this.userRepo.findOne({ where: { email } }),
    );

    // If user doesn't exist or is already active/suspended, add small jitter and return uniform message
    if (!user || user.status !== UserStatus.PENDING_EMAIL_VERIFICATION) {
      await new Promise((resolve) =>
        setTimeout(resolve, crypto.randomInt(120, 260)),
      );
      return uniformResponse;
    }

    const mostRecentToken = await this.dataSource.manager.findOne(
      EmailVerificationToken,
      {
        where: { user: { id: user.id } },
        order: { createdAt: 'DESC' },
      },
    );

    // Silently enforce cooldown without revealing account existence
    if (
      mostRecentToken &&
      Date.now() - mostRecentToken.createdAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      return uniformResponse;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const dedupKey = `verify:email:${user.id}:${Date.now()}`;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.query(
        `UPDATE identity.email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
        [user.id],
      );

      const verificationToken = queryRunner.manager.create(
        EmailVerificationToken,
        {
          user: { id: user.id },
          tokenHash,
          expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
        },
      );
      await queryRunner.manager.save(verificationToken);

      const outboxMsg = queryRunner.manager.create(OutboxMessage, {
        aggregateType: 'USER',
        aggregateId: user.id,
        eventType: 'USER_REGISTERED',
        payload: {
          email: user.email,
          username: user.username,
          verificationToken: rawToken,
        },
        status: OutboxStatus.PENDING,
        deduplicationKey: dedupKey,
        nextAttemptAt: new Date(Date.now() + OUTBOX_FAST_PATH_GRACE_MS),
      });
      await queryRunner.manager.save(outboxMsg);

      await queryRunner.commitTransaction();
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        'Failed to rotate verification token',
        this.formatError(error),
      );
      return uniformResponse;
    } finally {
      await queryRunner.release();
    }

    this.emailService
      .sendVerificationEmail(user.email, rawToken, dedupKey)
      .then(() =>
        this.dataSource.query(
          `UPDATE integration.outbox_messages SET status = $1, published_at = NOW() WHERE deduplication_key = $2`,
          [OutboxStatus.PUBLISHED, dedupKey],
        ),
      )
      .catch((err: unknown) => {
        this.logger.warn(
          `Immediate resend email deferred to Outbox worker: ${this.formatError(err)}`,
        );
      });

    return uniformResponse;
  }
}
