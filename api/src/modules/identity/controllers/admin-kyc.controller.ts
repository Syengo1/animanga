import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { KycService } from '../services/kyc.service';
import { z } from 'zod';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { UuidSchema } from '../../../common/validation/identifiers.schema';

const KycReviewSchema = z
  .object({
    notes: z.string().optional(),
  })
  .strict();
type KycReviewInput = z.infer<typeof KycReviewSchema>;

// @UseGuards(AuthGuard, AuthorizationGuard)
// @SetMetadata('permission', 'KYC_MANAGE')
@Controller('admin/kyc/cases')
export class AdminKycController {
  constructor(private readonly kycService: KycService) {}

  @Get()
  listPendingCases() {
    return { message: 'List UNDER_REVIEW KYC cases' };
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approveCase(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @Body(new ZodValidationPipe(KycReviewSchema)) body: KycReviewInput,
  ) {
    return { message: `Approved KYC case ${id}`, notes: body.notes };
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  rejectCase(
    @Param('id', new ZodValidationPipe(UuidSchema)) id: string,
    @Body(new ZodValidationPipe(KycReviewSchema)) body: KycReviewInput,
  ) {
    return { message: `Rejected KYC case ${id}`, notes: body.notes };
  }
}
