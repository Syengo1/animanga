// C:\Projects\animanga-platform\api\src\modules\identity\controllers\user.controller.ts
import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { KycService } from '../services/kyc.service';
import { AuthService } from '../services/auth.service';
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

@UseGuards(AuthGuard)
@Controller('users/me')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly kycService: KycService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.userService.getProfileById(req.user.id);
  }

  @Patch()
  updateProfile(
    @Body(new ZodValidationPipe(UpdateProfileSchema)) body: UpdateProfileInput,
  ) {
    return { message: 'Profile updated safely', data: body };
  }

  @Get('kyc')
  getKycStatus() {
    return { message: 'Return current KYC status and document list' };
  }

  @Post('kyc')
  submitKyc(
    @Body(new ZodValidationPipe(SubmitKycSchema)) body: SubmitKycInput,
  ) {
    return { message: 'KYC profile submitted for review', data: body };
  }

  @Post('link/google')
  @HttpCode(HttpStatus.OK)
  async linkGoogleAccount(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(GoogleAuthSchema)) body: GoogleAuthInput,
  ) {
    return this.authService.linkGoogleAccount(req.user.id, body);
  }
}
