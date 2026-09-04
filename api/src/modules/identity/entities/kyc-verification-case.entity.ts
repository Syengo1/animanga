import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { KycProfile } from './kyc-profile.entity';
import { User } from './user.entity';
import { KycCaseStatus } from '../enums/identity.enums';

@Entity({ schema: 'identity', name: 'kyc_verification_cases' })
export class KycVerificationCase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => KycProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kyc_profile_id' })
  kycProfile!: KycProfile;

  @Column({ type: 'enum', enum: KycCaseStatus })
  status!: KycCaseStatus;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer?: User;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Append-only table: No @UpdateDateColumn
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
