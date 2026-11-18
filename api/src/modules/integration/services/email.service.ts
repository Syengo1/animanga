// C:\Projects\animanga-platform\api\src\modules\integration\services\email.service.ts
import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface MailTransportInfo {
  messageId?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter<MailTransportInfo>;
  private readonly recentIdempotencyKeys = new Map<string, number>();
  private readonly IDEMPOTENCY_TTL_MS = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });
  }

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

  private escapeHtml(raw: string): string {
    return raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private isDuplicateDispatch(idempotencyKey: string): boolean {
    const now = Date.now();
    for (const [key, timestamp] of this.recentIdempotencyKeys.entries()) {
      if (now - timestamp > this.IDEMPOTENCY_TTL_MS) {
        this.recentIdempotencyKeys.delete(key);
      }
    }
    const existing = this.recentIdempotencyKeys.get(idempotencyKey);
    if (existing && now - existing < this.IDEMPOTENCY_TTL_MS) {
      return true;
    }
    this.recentIdempotencyKeys.set(idempotencyKey, now);
    return false;
  }

  async sendVerificationEmail(
    email: string,
    rawToken: string,
    idempotencyKey: string,
  ): Promise<{ messageId: string }> {
    if (this.isDuplicateDispatch(idempotencyKey)) {
      this.logger.log(
        `Skipped duplicate verification email for ${email} [key=${idempotencyKey}]`,
      );
      return { messageId: `deduplicated:${idempotencyKey}` };
    }

    const baseUrl =
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_WEB_URL ||
      'https://animangaweb.vercel.app';
    const verifyLink = `${baseUrl.replace(/\/$/, '')}/register?token=${rawToken}`;
    const senderEmail = process.env.EMAIL_USER ?? 'noreply@animanga.app';

    try {
      const info = await this.transporter.sendMail({
        from: `"Animanga Platform" <${senderEmail}>`,
        replyTo: senderEmail,
        to: email,
        subject: 'Confirm your Animanga account registration',
        text: [
          'Welcome to Animanga!',
          '',
          'Please confirm your email address and activate your account by opening the link below:',
          verifyLink,
          '',
          'This verification link is valid for 24 hours.',
          'If you did not create an Animanga account, you can safely ignore this email.',
        ].join('\n'),
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; background-color: #182334; padding: 32px; border-radius: 14px; color: #e6eef8; border: 1px solid rgba(148, 170, 196, 0.2);">
            <h2 style="color: #e6eef8; font-size: 22px; margin-top: 0; margin-bottom: 16px;">Confirm your Animanga account</h2>
            <p style="color: #94aac4; font-size: 15px; line-height: 1.6; margin-bottom: 28px;">
              Thank you for registering on Animanga. Click the button below to confirm your email address and activate your account:
            </p>
            <p style="margin-bottom: 28px;">
              <a href="${verifyLink}" style="display: inline-block; background-color: #548ccf; color: #0e1622; text-decoration: none; padding: 13px 26px; border-radius: 10px; font-weight: bold; font-size: 15px;">
                Confirm Email Address
              </a>
            </p>
            <p style="color: #94aac4; font-size: 13px; line-height: 1.5; margin-bottom: 24px; word-break: break-all;">
              Or copy and paste this link into your browser:<br />
              <a href="${verifyLink}" style="color: #7aa8e0;">${verifyLink}</a>
            </p>
            <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">
              This link expires in 24 hours. If you did not request this email, you can safely ignore it.
            </p>
          </div>
        `,
      });

      const messageId = info.messageId ?? 'unknown';
      this.logger.log(
        `Verification email delivered to ${email} [key=${idempotencyKey}, messageId=${messageId}]`,
      );
      return { messageId };
    } catch (error: unknown) {
      this.recentIdempotencyKeys.delete(idempotencyKey);
      this.logger.error(
        `Failed to send verification email to ${email} [key=${idempotencyKey}]`,
        this.formatError(error),
      );
      throw new InternalServerErrorException(
        'Failed to deliver verification email',
      );
    }
  }

  async sendWelcomeEmail(
    email: string,
    username: string,
    idempotencyKey: string,
  ): Promise<{ messageId: string }> {
    if (this.isDuplicateDispatch(idempotencyKey)) {
      this.logger.log(
        `Skipped duplicate welcome email for ${email} [key=${idempotencyKey}]`,
      );
      return { messageId: `deduplicated:${idempotencyKey}` };
    }

    const baseUrl =
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_WEB_URL ||
      'https://animangaweb.vercel.app';
    const loginLink = `${baseUrl.replace(/\/$/, '')}/login`;
    const senderEmail = process.env.EMAIL_USER ?? 'noreply@animanga.app';
    const safeUsername = this.escapeHtml(username);

    try {
      const info = await this.transporter.sendMail({
        from: `"Animanga Platform" <${senderEmail}>`,
        replyTo: senderEmail,
        to: email,
        subject: 'Your Animanga account is now active',
        text: [
          `Hi ${username},`,
          '',
          'Your email has been verified and your Animanga account is now active.',
          `Sign in to your dashboard here: ${loginLink}`,
        ].join('\n'),
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; background-color: #182334; padding: 32px; border-radius: 14px; color: #e6eef8; border: 1px solid rgba(148, 170, 196, 0.2);">
            <h2 style="color: #e6eef8; font-size: 22px; margin-top: 0; margin-bottom: 16px;">Account Verified</h2>
            <p style="color: #94aac4; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
              Your email has been verified, <strong style="color: #e6eef8;">${safeUsername}</strong>.
            </p>
            <p style="color: #94aac4; font-size: 15px; line-height: 1.6; margin-bottom: 28px;">
              You now have full access to Animanga. Manage your digital tickets, track airing anime, and explore the manga catalog.
            </p>
            <a href="${loginLink}" style="display: inline-block; background-color: #38b28b; color: #0e1622; text-decoration: none; padding: 13px 26px; border-radius: 10px; font-weight: bold; font-size: 15px;">
              Sign In to Animanga
            </a>
          </div>
        `,
      });

      const messageId = info.messageId ?? 'unknown';
      this.logger.log(
        `Welcome email delivered to ${email} [key=${idempotencyKey}, messageId=${messageId}]`,
      );
      return { messageId };
    } catch (error: unknown) {
      this.recentIdempotencyKeys.delete(idempotencyKey);
      this.logger.error(
        `Failed to send welcome email to ${email} [key=${idempotencyKey}]`,
        this.formatError(error),
      );
      throw new InternalServerErrorException('Failed to deliver welcome email');
    }
  }
}
