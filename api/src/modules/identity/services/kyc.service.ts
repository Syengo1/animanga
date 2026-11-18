// C:\Projects\animanga-platform\api\src\modules\identity\services\kyc.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { KycProfile } from '../entities/kyc-profile.entity';
import { KycVerificationCase } from '../entities/kyc-verification-case.entity';
import { KycProfileStatus, KycCaseStatus } from '../enums/identity.enums';
import { SubmitKycInput } from '../schemas/user.schema';

@Injectable()
export class KycService {
  constructor(
    @InjectRepository(KycProfile)
    private readonly kycProfileRepo: Repository<KycProfile>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getKycStatus(userId: string) {
    const profile = await this.kycProfileRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!profile) {
      return {
        submitted: false,
        verificationStatus: KycProfileStatus.UNVERIFIED,
        legalName: null,
        hasKraPin: false,
        updatedAt: null,
      };
    }

    return {
      submitted: true,
      verificationStatus: profile.verificationStatus,
      legalName: profile.legalName,
      hasKraPin: Boolean(profile.kraPinHash),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  async submitKyc(userId: string, input: SubmitKycInput) {
    const kraPinHash = input.kraPin
      ? crypto
          .createHash('sha256')
          .update(input.kraPin.trim().toUpperCase())
          .digest('hex')
      : undefined;

    return this.dataSource.transaction(async (manager) => {
      let profile = await manager.findOne(KycProfile, {
        where: { user: { id: userId } },
      });

      if (!profile) {
        profile = manager.create(KycProfile, {
          user: { id: userId },
          legalName: input.legalName.trim(),
          kraPinHash,
          verificationStatus: KycProfileStatus.UNVERIFIED,
        });
      } else {
        profile.legalName = input.legalName.trim();
        if (kraPinHash) profile.kraPinHash = kraPinHash;
      }

      const savedProfile = await manager.save(KycProfile, profile);

      const verificationCase = manager.create(KycVerificationCase, {
        kycProfile: { id: savedProfile.id },
        status: KycCaseStatus.UNDER_REVIEW,
        notes: 'Organizer KYC submitted via user dashboard',
      });
      await manager.save(KycVerificationCase, verificationCase);

      return {
        submitted: true,
        verificationStatus: savedProfile.verificationStatus,
        legalName: savedProfile.legalName,
        hasKraPin: Boolean(savedProfile.kraPinHash),
        updatedAt: savedProfile.updatedAt.toISOString(),
      };
    });
  }
}
