import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KycProfile } from '../entities/kyc-profile.entity';

@Injectable()
export class KycService {
  constructor(
    @InjectRepository(KycProfile)
    private readonly kycProfileRepo: Repository<KycProfile>,
  ) {}
  // Future implementation: submitKyc, reviewKycCase, etc.
}
