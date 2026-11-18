// C:\Projects\animanga-platform\api\src\modules\identity\controllers\auth.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  Ip,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import {
  RegisterSchema,
  RegisterInput,
  LoginSchema,
  LoginInput,
  GoogleAuthSchema,
  GoogleAuthInput,
} from '../schemas/auth.schema';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';

const PROD_AUTH_COOKIE_NAME = '__Host-animanga_session';
const DEV_AUTH_COOKIE_NAME = 'animanga_session';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const EmailLookupSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email('Invalid email format')
      .max(320)
      .toLowerCase(),
  })
  .strict();

type EmailLookupInput = z.infer<typeof EmailLookupSchema>;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  private setSessionCookie(res: Response, sessionToken: string): void {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieName = isProd ? PROD_AUTH_COOKIE_NAME : DEV_AUTH_COOKIE_NAME;

    res.cookie(cookieName, sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_MS,
    });
  }

  private clearSessionCookies(res: Response): void {
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd) {
      res.clearCookie(PROD_AUTH_COOKIE_NAME, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
      });
    }

    res.clearCookie(DEV_AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) body: RegisterInput,
  ) {
    return this.authService.register(body);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body('token') token?: string) {
    if (typeof token !== 'string' || !token.trim()) {
      throw new BadRequestException({
        code: 'VERIFICATION_TOKEN_INVALID',
        message: 'Verification token is required',
      });
    }
    return this.authService.verifyEmail(token.trim());
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const { sessionToken, id, email, username, roles, permissions } =
      await this.authService.login(body, ip, userAgent);

    this.setSessionCookie(res, sessionToken);

    return {
      success: true,
      message: 'Authentication successful',
      data: { id, email, username, roles, permissions },
    };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(
    @Body(new ZodValidationPipe(GoogleAuthSchema)) body: GoogleAuthInput,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.authService.googleLogin(body, ip, userAgent);

    this.setSessionCookie(res, result.sessionToken);

    return {
      success: true,
      message: 'Google authentication successful',
      data: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        roles: result.roles,
        permissions: result.permissions,
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = (req.cookies || {}) as Record<string, string | undefined>;
    const tokenCandidates = [
      cookies[PROD_AUTH_COOKIE_NAME],
      cookies[DEV_AUTH_COOKIE_NAME],
    ].filter((t): t is string => typeof t === 'string' && Boolean(t.trim()));

    for (const rawToken of tokenCandidates) {
      await this.sessionService.revokeSession(rawToken);
    }

    this.clearSessionCookies(res);
    return;
  }

  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Get('status')
  async getRegistrationStatus(@Query('email') rawEmail?: string | string[]) {
    const emailStr = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;
    if (typeof emailStr !== 'string' || !emailStr.trim()) {
      throw new BadRequestException(
        'A valid email query parameter is required',
      );
    }
    return this.authService.checkRegistrationStatus(emailStr);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body(new ZodValidationPipe(EmailLookupSchema)) body: EmailLookupInput,
  ) {
    return this.authService.resendVerificationEmail(body.email);
  }
}
