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
import { OAuth2Client } from 'google-auth-library'; // <-- NEW

import { User, UserStatus } from '../entities/user.entity';
import { PasswordCredential } from '../entities/password-credential.entity';
import { EmailVerificationToken } from '../entities/email-verification-token.entity';
import {
  ExternalIdentity,
  IdentityProvider,
} from '../entities/external-identity.entity'; // <-- NEW
import { OutboxMessage } from '../../integration/entities/outbox-message.entity';
import { OutboxStatus } from '../../integration/enums/integration.enums';
import {
  RegisterInput,
  LoginInput,
  GoogleAuthInput,
} from '../schemas/auth.schema'; // <-- NEW
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // NEW: Google OAuth2 Client
  private readonly googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly sessionService: SessionService,
  ) {}

  private async generateAvailableSuggestions(base: string): Promise<string[]> {
    const candidates = [
      `${base}_official`,
      `${base}_real`,
      `${base}${new Date().getFullYear()}`,
      `${base}_${Math.floor(100 + Math.random() * 900)}`,
      `${base}${Math.floor(10 + Math.random() * 90)}`,
    ];

    const takenUsers = await this.userRepo.find({
      where: { username: In(candidates) },
      select: { username: true },
    });

    const takenSet = new Set(takenUsers.map((u) => u.username));
    return candidates.filter((c) => !takenSet.has(c)).slice(0, 4);
  }

  async register(input: RegisterInput) {
    const emailExists = await this.userRepo.exists({
      where: { email: input.email },
    });

    if (emailExists) {
      throw new ConflictException('Email is already registered');
    }

    let finalUsername = input.username;

    if (!finalUsername) {
      finalUsername = `user_${crypto.randomBytes(4).toString('hex')}`;
    } else {
      const usernameExists = await this.userRepo.exists({
        where: { username: finalUsername },
      });

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
        email: input.email,
        username: finalUsername,
        firstName: input.firstName,
        lastName: input.lastName,
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
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      );
      await queryRunner.manager.save(verificationToken);

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
        deduplicationKey: `verify:email:${savedUser.id}`,
        nextAttemptAt: new Date(),
      });
      await queryRunner.manager.save(outboxMsg);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        'Registration transaction failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Failed to process registration');
    } finally {
      await queryRunner.release();
    }

    return {
      id: savedUser.id,
      username: savedUser.username,
      email: savedUser.email,
      message:
        'Registration initiated. Please check your email to verify your account.',
    };
  }

  async verifyEmail(rawToken: string) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const verificationRecord = await queryRunner.manager.findOne(
        EmailVerificationToken,
        {
          where: { tokenHash },
          relations: { user: true },
        },
      );

      if (!verificationRecord) {
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

      verificationRecord.usedAt = new Date();
      await queryRunner.manager.save(verificationRecord);

      verificationRecord.user.status = UserStatus.ACTIVE;
      verificationRecord.user.emailVerifiedAt = new Date();
      await queryRunner.manager.save(verificationRecord.user);

      const outboxMsg = queryRunner.manager.create(OutboxMessage, {
        aggregateType: 'USER',
        aggregateId: verificationRecord.user.id,
        eventType: 'USER_ACTIVATED',
        payload: {
          email: verificationRecord.user.email,
          username: verificationRecord.user.username,
        },
        status: OutboxStatus.PENDING,
        deduplicationKey: `welcome:email:${verificationRecord.user.id}`,
        nextAttemptAt: new Date(),
      });
      await queryRunner.manager.save(outboxMsg);

      await queryRunner.commitTransaction();

      return { success: true, message: 'Email successfully verified' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof BadRequestException) throw error;

      this.logger.error(
        'Email verification failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Failed to verify email');
    } finally {
      await queryRunner.release();
    }
  }

  async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    const user = await this.userRepo.findOne({
      where: { email: input.email },
      relations: { passwordCredential: true },
    });

    if (!user || !user.passwordCredential) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.PENDING_EMAIL_VERIFICATION) {
      throw new UnauthorizedException(
        'Please verify your email address before logging in.',
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account is suspended or disabled.');
    }

    const isPasswordValid = await argon2.verify(
      user.passwordCredential.passwordHash,
      input.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { rawToken } = await this.sessionService.createSession(
      user,
      ipAddress,
      userAgent,
    );

    return {
      sessionToken: rawToken,
      id: user.id,
      email: user.email,
      username: user.username,
      roles: [],
      permissions: [],
    };
  }

  // ====================================================================
  // F03.0 & F03.1: GOOGLE IDENTITY SERVICES
  // ====================================================================

  /**
   * Exchanges the auth code and verifies Google's cryptographic signature
   */
  private async verifyGoogleCode(code: string, redirectUri: string) {
    try {
      const { tokens } = await this.googleClient.getToken({
        code,
        redirect_uri: redirectUri,
      });
      const ticket = await this.googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      return ticket.getPayload();
    } catch (error) {
      this.logger.error(
        'Google token exchange failed',
        error instanceof Error ? error.stack : String(error),
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
  ) {
    const payload = await this.verifyGoogleCode(input.code, input.redirectUri);
    const { sub, email, given_name, family_name, email_verified } = payload;

    if (!sub || !email) {
      throw new UnauthorizedException('Incomplete Google profile returned');
    }

    // CASE 1: Returning Google User
    const existingIdentity = await this.dataSource.manager.findOne(
      ExternalIdentity,
      {
        where: { provider: IdentityProvider.GOOGLE, providerSubject: sub },
        relations: { user: true },
      },
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
      return { sessionToken: rawToken, user: existingIdentity.user };
    }

    // CASE 2: Account Conflict (Email exists but no Google Identity linked)
    const existingUser = await this.userRepo.findOne({ where: { email } });
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
      // Safely auto-generate a username based on the email
      let baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      const exists = await queryRunner.manager.exists(User, {
        where: { username: baseUsername },
      });
      if (exists) {
        baseUsername = `${baseUsername}_${crypto.randomBytes(2).toString('hex')}`;
      }

      // Create the User (Already Verified by Google)
      const user = queryRunner.manager.create(User, {
        email,
        username: baseUsername,
        firstName: given_name,
        lastName: family_name,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: email_verified ? new Date() : undefined,
      });
      savedUser = await queryRunner.manager.save(user);

      // Create the External Identity boundary
      const externalIdentity = queryRunner.manager.create(ExternalIdentity, {
        user: { id: savedUser.id },
        provider: IdentityProvider.GOOGLE,
        providerSubject: sub,
        providerEmail: email,
      });
      await queryRunner.manager.save(externalIdentity);

      // Dispatch Welcome Email directly via Outbox (bypassing verification logic)
      const outboxMsg = queryRunner.manager.create(OutboxMessage, {
        aggregateType: 'USER',
        aggregateId: savedUser.id,
        eventType: 'USER_ACTIVATED',
        payload: { email: savedUser.email, username: savedUser.username },
        status: OutboxStatus.PENDING,
        deduplicationKey: `welcome:email:${savedUser.id}`,
        nextAttemptAt: new Date(),
      });
      await queryRunner.manager.save(outboxMsg);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        'Failed to provision Google account',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Failed to process Google sign-in',
      );
    } finally {
      await queryRunner.release();
    }

    // Provision Session
    const { rawToken } = await this.sessionService.createSession(
      savedUser,
      ipAddress,
      userAgent,
    );
    return { sessionToken: rawToken, user: savedUser };
  }

  async linkGoogleAccount(userId: string, input: GoogleAuthInput) {
    const payload = await this.verifyGoogleCode(input.code, input.redirectUri);
    const { sub, email } = payload;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Ensure no one else has claimed this Google account
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

      const externalIdentity = queryRunner.manager.create(ExternalIdentity, {
        user: { id: userId },
        provider: IdentityProvider.GOOGLE,
        providerSubject: sub,
        providerEmail: email,
      });

      await queryRunner.manager.save(externalIdentity);
      await queryRunner.commitTransaction();

      return { success: true, message: 'Google account linked successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ConflictException) throw error;
      this.logger.error(
        'Failed to link Google account',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Failed to link Google account');
    } finally {
      await queryRunner.release();
    }
  }
}
