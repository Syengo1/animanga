import {
  Controller,
  Post,
  Body,
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

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('register')
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) body: RegisterInput,
  ) {
    return this.authService.register(body);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body('token') token: string) {
    if (!token) {
      throw new BadRequestException({
        code: 'VERIFICATION_TOKEN_INVALID',
        message: 'Verification token is required',
      });
    }
    return this.authService.verifyEmail(token);
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
    // FIX: Extract the newly added fields from the service
    const { sessionToken, id, email, username, roles, permissions } =
      await this.authService.login(body, ip, userAgent);

    const isProd = process.env.NODE_ENV === 'production';
    const cookieName = isProd ? '__Host-animanga_session' : 'animanga_session';

    res.cookie(cookieName, sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      success: true,
      message: 'Authentication successful',
      // FIX: Provide the full AuthUser payload to the frontend
      data: { id, email, username, roles, permissions },
    };
  }

  // NEW: Google Authentication Endpoint
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(
    @Body(new ZodValidationPipe(GoogleAuthSchema)) body: GoogleAuthInput,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const { sessionToken, user } = await this.authService.googleLogin(
      body,
      ip,
      userAgent,
    );

    const isProd = process.env.NODE_ENV === 'production';
    const cookieName = isProd ? '__Host-animanga_session' : 'animanga_session';

    res.cookie(cookieName, sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      success: true,
      message: 'Google authentication successful',
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        roles: [],
        permissions: [],
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieName = isProd ? '__Host-animanga_session' : 'animanga_session';

    // FIX: Safely cast req.cookies to a strict Record type to satisfy ESLint
    const cookies = (req.cookies || {}) as Record<string, string | undefined>;
    const sessionToken = cookies[cookieName];

    // Strict runtime check to ensure it's actually a string before passing to the service
    if (typeof sessionToken === 'string') {
      await this.sessionService.revokeSession(sessionToken);
    }

    res.clearCookie(cookieName, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });

    return;
  }
}
