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

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
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

  async sendVerificationEmail(
    email: string,
    rawToken: string,
    idempotencyKey: string,
  ): Promise<{ messageId: string }> {
    const baseUrl =
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_WEB_URL ||
      'http://localhost:3000';
    const verifyLink = `${baseUrl}/register?token=${rawToken}`;

    try {
      const info = await this.transporter.sendMail({
        from: `"Animanga Platform" <${process.env.EMAIL_USER ?? 'noreply@animanga.app'}>`,
        to: email,
        subject: 'Verify your Animanga Identity',
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 500px; margin: 0 auto; background-color: #182334; padding: 32px; border-radius: 14px; color: #e6eef8; border: 1px solid rgba(148, 170, 196, 0.2);">
            <h2 style="color: #e6eef8; font-size: 24px; margin-bottom: 16px;">Welcome to Animanga.</h2>
            <p style="color: #94aac4; font-size: 16px; line-height: 1.5; margin-bottom: 32px;">
              Your identity has been reserved. Click the button below to cryptographically verify your email address and activate your account.
            </p>
            <a href="${verifyLink}" style="display: inline-block; background-color: #548ccf; color: #0e1622; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: bold; font-size: 16px;">
              Verify Identity
            </a>
            <p style="color: #64748b; font-size: 12px; margin-top: 32px;">
              This secure link expires in 24 hours. If you did not initiate this request, safely ignore this email.
            </p>
          </div>
        `,
        headers: { 'Idempotency-Key': idempotencyKey },
      });

      const messageId = info.messageId ?? 'unknown';
      this.logger.log(
        `Verification email successfully delivered to ${email} (MessageId: ${messageId})`,
      );
      return { messageId };
    } catch (error: unknown) {
      this.logger.error(
        `Failed to send verification email to ${email}`,
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
    const baseUrl =
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_WEB_URL ||
      'http://localhost:3000';
    const loginLink = `${baseUrl}/login`;

    try {
      const info = await this.transporter.sendMail({
        from: `"Animanga Platform" <${process.env.EMAIL_USER ?? 'noreply@animanga.app'}>`,
        to: email,
        subject: 'Identity Verified. Welcome to Animanga.',
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 500px; margin: 0 auto; background-color: #182334; padding: 32px; border-radius: 14px; color: #e6eef8; border: 1px solid rgba(148, 170, 196, 0.2);">
            <h2 style="color: #e6eef8; font-size: 24px; margin-bottom: 16px;">Link Established.</h2>
            <p style="color: #94aac4; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
              Your email has been successfully verified, <strong style="color: #e6eef8;">${username}</strong>.
            </p>
            <p style="color: #94aac4; font-size: 16px; line-height: 1.5; margin-bottom: 32px;">
              You now have full access to the Animanga platform. Manage your digital tickets, track upcoming conventions, and secure limited edition merchandise drops.
            </p>
            <a href="${loginLink}" style="display: inline-block; background-color: #38b28b; color: #0e1622; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: bold; font-size: 16px;">
              Access Dashboard
            </a>
          </div>
        `,
        headers: { 'Idempotency-Key': idempotencyKey },
      });

      const messageId = info.messageId ?? 'unknown';
      this.logger.log(
        `Welcome email successfully delivered to ${email} (MessageId: ${messageId})`,
      );
      return { messageId };
    } catch (error: unknown) {
      this.logger.error(
        `Failed to send welcome email to ${email}`,
        this.formatError(error),
      );
      throw new InternalServerErrorException('Failed to deliver welcome email');
    }
  }
}
