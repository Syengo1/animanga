// C:\Projects\animanga-platform\api\src\modules\integration\services\email.service.ts
import {
  Injectable,
  Logger,
  InternalServerErrorException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lookup } from 'dns/promises';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

interface MailTransportInfo {
  messageId?: string;
}

interface IdempotentMailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface BrevoApiResponse {
  messageId?: string;
  message?: string;
  code?: string;
}

const GMAIL_SMTP_HOST = 'smtp.gmail.com';
const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private readonly completedKeys = new Map<string, number>();
  private readonly inFlightDispatches = new Map<
    string,
    Promise<{ messageId: string }>
  >();
  private readonly IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

  constructor(@Optional() private readonly configService?: ConfigService) {}

  onModuleInit(): void {
    const { brevoApiKey, user, pass } = this.getConfig();
    if (brevoApiKey && user) {
      this.logger.log(
        `EmailService ready (Brevo HTTPS Port 443) for sender: ${user}`,
      );
    } else if (user && pass) {
      this.logger.log(
        `EmailService ready (Gmail SMTP IPv4 fallback) for sender: ${user}. Set BREVO_API_KEY on Render to send over HTTPS port 443.`,
      );
    } else {
      this.logger.error(
        'EMAIL NOT CONFIGURED: Set BREVO_API_KEY + EMAIL_USER (recommended on Render) or EMAIL_USER + EMAIL_APP_PASSWORD.',
      );
    }
  }

  private cleanEnv(raw?: string): string | undefined {
    if (!raw) return undefined;
    const cleaned = raw
      .trim()
      .replace(/^["']|["']$/g, '')
      .trim();
    return cleaned || undefined;
  }

  private getConfig(): {
    brevoApiKey?: string;
    user?: string;
    pass?: string;
  } {
    const brevoApiKey = this.cleanEnv(
      this.configService?.get<string>('BREVO_API_KEY') ??
        process.env.BREVO_API_KEY,
    );
    const user = this.cleanEnv(
      this.configService?.get<string>('EMAIL_USER') ?? process.env.EMAIL_USER,
    );
    const rawPass = this.cleanEnv(
      this.configService?.get<string>('EMAIL_APP_PASSWORD') ??
        process.env.EMAIL_APP_PASSWORD,
    );
    const pass = rawPass ? rawPass.replace(/\s+/g, '') : undefined;
    return { brevoApiKey, user, pass };
  }

  private getFrontendBaseUrl(): string {
    return (
      this.cleanEnv(
        this.configService?.get<string>('FRONTEND_URL') ??
          process.env.FRONTEND_URL,
      ) ||
      this.cleanEnv(
        this.configService?.get<string>('NEXT_PUBLIC_WEB_URL') ??
          process.env.NEXT_PUBLIC_WEB_URL,
      ) ||
      'https://animangaweb.vercel.app'
    ).replace(/\/$/, '');
  }

  private async resolveGmailIpv4Host(): Promise<string> {
    try {
      const record = await lookup(GMAIL_SMTP_HOST, { family: 4 });
      return record.address || GMAIL_SMTP_HOST;
    } catch {
      return GMAIL_SMTP_HOST;
    }
  }

  private createTransport(
    host: string,
    port: 465 | 587,
    user: string,
    pass: string,
  ): nodemailer.Transporter<MailTransportInfo> {
    const options: SMTPTransport.Options = {
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 12_000,
      tls: {
        servername: GMAIL_SMTP_HOST,
      },
      auth: { user, pass },
    };
    return nodemailer.createTransport(options);
  }

  private async sendViaBrevo(
    apiKey: string,
    senderEmail: string,
    mailOptions: IdempotentMailPayload,
  ): Promise<string> {
    const res = await fetch(BREVO_SEND_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        sender: { name: 'Animanga Platform', email: senderEmail },
        replyTo: { email: senderEmail },
        to: [{ email: mailOptions.to }],
        subject: mailOptions.subject,
        textContent: mailOptions.text,
        htmlContent: mailOptions.html,
      }),
    });

    const body = (await res.json().catch(() => ({}))) as BrevoApiResponse;
    if (!res.ok) {
      throw new Error(
        `Brevo HTTP ${res.status}: ${body.message || body.code || 'Request rejected'}`,
      );
    }

    return body.messageId ?? 'brevo-accepted';
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

  private pruneCompletedKeys(): void {
    const now = Date.now();
    for (const [key, ts] of this.completedKeys.entries()) {
      if (now - ts > this.IDEMPOTENCY_TTL_MS) {
        this.completedKeys.delete(key);
      }
    }
  }

  private async sendIdempotentMail(
    idempotencyKey: string,
    mailOptions: IdempotentMailPayload,
    label: string,
  ): Promise<{ messageId: string }> {
    this.pruneCompletedKeys();

    if (this.completedKeys.has(idempotencyKey)) {
      this.logger.log(
        `Skipped already-delivered ${label} [key=${idempotencyKey}]`,
      );
      return { messageId: `deduplicated:${idempotencyKey}` };
    }

    const existingFlight = this.inFlightDispatches.get(idempotencyKey);
    if (existingFlight !== undefined) {
      return existingFlight;
    }

    const { brevoApiKey, user, pass } = this.getConfig();
    if (!user || (!brevoApiKey && !pass)) {
      this.logger.error(
        `Cannot send ${label}: configure BREVO_API_KEY + EMAIL_USER (or EMAIL_USER + EMAIL_APP_PASSWORD).`,
      );
      throw new InternalServerErrorException(
        'Email service credentials are not configured',
      );
    }

    const dispatchPromise = (async (): Promise<{ messageId: string }> => {
      // 1. Primary path: HTTPS Port 443 via Brevo API (never blocked on Render Free Tier)
      if (brevoApiKey) {
        try {
          const messageId = await this.sendViaBrevo(
            brevoApiKey,
            user,
            mailOptions,
          );
          this.completedKeys.set(idempotencyKey, Date.now());
          this.logger.log(
            `${label} delivered to ${mailOptions.to} via Brevo HTTPS [key=${idempotencyKey}, messageId=${messageId}]`,
          );
          return { messageId };
        } catch (err: unknown) {
          this.logger.error(
            `Brevo HTTPS ${label} failed for ${mailOptions.to} [key=${idempotencyKey}]`,
            this.formatError(err),
          );
          if (!pass) {
            throw new InternalServerErrorException(
              `Failed to deliver ${label}`,
            );
          }
        }
      }

      // 2. Fallback path: Gmail SMTP (for local development or paid servers with open SMTP)
      if (!pass) {
        throw new InternalServerErrorException(`Failed to deliver ${label}`);
      }

      const smtpHost = await this.resolveGmailIpv4Host();
      const fullOptions: nodemailer.SendMailOptions = {
        ...mailOptions,
        from: `"Animanga Platform" <${user}>`,
        replyTo: user,
      };

      const ports: Array<465 | 587> = [465, 587];
      let lastError: unknown;

      for (const port of ports) {
        const transport = this.createTransport(smtpHost, port, user, pass);
        try {
          const info = await transport.sendMail(fullOptions);
          const messageId = info.messageId ?? 'unknown';
          this.completedKeys.set(idempotencyKey, Date.now());
          this.logger.log(
            `${label} delivered to ${mailOptions.to} via SMTP port ${port} [key=${idempotencyKey}, messageId=${messageId}]`,
          );
          return { messageId };
        } catch (err: unknown) {
          lastError = err;
          this.logger.warn(
            `${label} attempt on Gmail SMTP port ${port} failed: ${err instanceof Error ? err.message : 'Unknown SMTP error'}`,
          );
        } finally {
          transport.close();
        }
      }

      this.logger.error(
        `Failed to send ${label} to ${mailOptions.to} on all transports [key=${idempotencyKey}]`,
        this.formatError(lastError),
      );
      throw new InternalServerErrorException(`Failed to deliver ${label}`);
    })();

    this.inFlightDispatches.set(idempotencyKey, dispatchPromise);
    try {
      return await dispatchPromise;
    } finally {
      this.inFlightDispatches.delete(idempotencyKey);
    }
  }

  sendVerificationEmail(
    email: string,
    rawToken: string,
    idempotencyKey: string,
  ): Promise<{ messageId: string }> {
    const verifyLink = `${this.getFrontendBaseUrl()}/register?token=${rawToken}`;

    return this.sendIdempotentMail(
      idempotencyKey,
      {
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
      },
      'verification email',
    );
  }

  sendWelcomeEmail(
    email: string,
    username: string,
    idempotencyKey: string,
  ): Promise<{ messageId: string }> {
    const loginLink = `${this.getFrontendBaseUrl()}/login`;
    const safeUsername = this.escapeHtml(username);

    return this.sendIdempotentMail(
      idempotencyKey,
      {
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
              You now have full access to Animanga. Track airing anime, manage your library, and access your convention ticket wallet.
            </p>
            <a href="${loginLink}" style="display: inline-block; background-color: #38b28b; color: #0e1622; text-decoration: none; padding: 13px 26px; border-radius: 10px; font-weight: bold; font-size: 15px;">
              Sign In to Dashboard
            </a>
          </div>
        `,
      },
      'welcome email',
    );
  }
}
