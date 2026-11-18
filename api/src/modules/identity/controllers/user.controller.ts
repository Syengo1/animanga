// C:\Projects\animanga-platform\api\src\modules\identity\controllers\user.controller.ts
import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { KycService } from '../services/kyc.service';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import {
  UpdateProfileSchema,
  UpdateProfileInput,
  SubmitKycSchema,
  SubmitKycInput,
} from '../schemas/user.schema';
import { GoogleAuthSchema, GoogleAuthInput } from '../schemas/auth.schema';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { AuthenticatedRequest } from '../../../common/interfaces/request.interface';

const PROD_AUTH_COOKIE_NAME = '__Host-animanga_session';
const DEV_AUTH_COOKIE_NAME = 'animanga_session';

@UseGuards(AuthGuard)
@Controller('users/me')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly kycService: KycService,
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  private extractCurrentToken(req: AuthenticatedRequest): string | undefined {
    const cookies = (req.cookies || {}) as Record<string, string | undefined>;
    return cookies[PROD_AUTH_COOKIE_NAME] || cookies[DEV_AUTH_COOKIE_NAME];
  }

  @Get()
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.userService.getProfileById(req.user.id);
  }

  @Patch()
  updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(UpdateProfileSchema)) body: UpdateProfileInput,
  ) {
    return this.userService.updateProfile(req.user.id, body);
  }

  @Get('sessions')
  getActiveSessions(@Req() req: AuthenticatedRequest) {
    const rawToken = this.extractCurrentToken(req);
    return this.sessionService.listActiveSessions(req.user.id, rawToken);
  }

  @Delete('sessions/others')
  @HttpCode(HttpStatus.OK)
  revokeOtherSessions(@Req() req: AuthenticatedRequest) {
    const rawToken = this.extractCurrentToken(req);
    return this.sessionService.revokeOtherUserSessions(req.user.id, rawToken);
  }

  @Get('kyc')
  getKycStatus(@Req() req: AuthenticatedRequest) {
    return this.kycService.getKycStatus(req.user.id);
  }

  @Post('kyc')
  submitKyc(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(SubmitKycSchema)) body: SubmitKycInput,
  ) {
    return this.kycService.submitKyc(req.user.id, body);
  }

  @Post('link/google')
  @HttpCode(HttpStatus.OK)
  linkGoogleAccount(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(GoogleAuthSchema)) body: GoogleAuthInput,
  ) {
    return this.authService.linkGoogleAccount(req.user.id, body);
  }
}
