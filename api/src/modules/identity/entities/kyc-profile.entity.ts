import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { KycProfileStatus } from '../enums/identity.enums';

@Entity({ schema: 'identity', name: 'kyc_profiles' })
export class KycProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'legal_name', type: 'varchar', length: 255 })
  legalName!: string;

  @Column({ name: 'kra_pin_hash', type: 'text', nullable: true })
  kraPinHash?: string;

  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: KycProfileStatus,
    default: KycProfileStatus.UNVERIFIED,
  })
  verificationStatus!: KycProfileStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
