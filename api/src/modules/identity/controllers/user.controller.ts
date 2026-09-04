import { Controller, Get, Patch, Post, Body } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { KycService } from '../services/kyc.service';
import {
  UpdateProfileSchema,
  UpdateProfileInput,
  SubmitKycSchema,
  SubmitKycInput,
} from '../schemas/user.schema';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';

// @UseGuards(AuthGuard) // In a real run, this protects all endpoints here
@Controller('users/me')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly kycService: KycService,
  ) {}

  @Get()
  getProfile() {
    return { message: 'Return current user profile (No password hash!)' };
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
    // Will call this.kycService.submit(...)
    return { message: 'KYC profile submitted for review', data: body };
  }
}
