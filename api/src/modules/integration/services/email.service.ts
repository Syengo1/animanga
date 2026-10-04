import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendVerificationEmail(
    email: string,
    rawToken: string,
    idempotencyKey: string,
  ) {
    const verifyLink = `${process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000'}/register?token=${rawToken}`;

    try {
      const { data, error } = await this.resend.emails.send({
        from: 'Animanga <onboarding@resend.dev>',
        to: email,
        subject: 'Verify your Animanga Identity',
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; background-color: #100c14; padding: 32px; border-radius: 12px; color: white;">
            <h2 style="color: #ffffff; font-size: 24px; margin-bottom: 16px;">Welcome to the Void.</h2>
            <p style="color: #a1a1aa; font-size: 16px; line-height: 1.5; margin-bottom: 32px;">
              Your identity has been reserved. Click the button below to cryptographically verify your email address and activate your account.
            </p>
            <a href="${verifyLink}" style="display: inline-block; background-color: #6366f1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Verify Identity
            </a>
            <p style="color: #52525b; font-size: 12px; margin-top: 32px;">
              This secure link expires in 24 hours. If you did not initiate this request, safely ignore this email.
            </p>
          </div>
        `,
        headers: { 'Idempotency-Key': idempotencyKey },
      });

      if (error) throw new Error(error.message);
      this.logger.log(
        `Verification email successfully delivered to ${email} (ID: ${data?.id})`,
      );
      return data;
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${email}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  // --- NEW: The Welcome Sequence ---
  async sendWelcomeEmail(
    email: string,
    username: string,
    idempotencyKey: string,
  ) {
    const loginLink = `${process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000'}/login`;

    try {
      const { data, error } = await this.resend.emails.send({
        from: 'Animanga <onboarding@resend.dev>',
        to: email,
        subject: 'Identity Verified. Welcome to Animanga.',
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; background-color: #100c14; padding: 32px; border-radius: 12px; color: white;">
            <h2 style="color: #ffffff; font-size: 24px; margin-bottom: 16px;">Link Established.</h2>
            <p style="color: #a1a1aa; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
              Your email has been successfully verified, <strong>${username}</strong>. 
            </p>
            <p style="color: #a1a1aa; font-size: 16px; line-height: 1.5; margin-bottom: 32px;">
              You now have full access to the Animanga platform. Manage your digital tickets, track upcoming conventions, and secure limited edition merchandise drops.
            </p>
            <a href="${loginLink}" style="display: inline-block; background-color: #34A853; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Access Dashboard
            </a>
          </div>
        `,
        headers: { 'Idempotency-Key': idempotencyKey },
      });

      if (error) throw new Error(error.message);
      this.logger.log(
        `Welcome email successfully delivered to ${email} (ID: ${data?.id})`,
      );
      return data;
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to ${email}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
