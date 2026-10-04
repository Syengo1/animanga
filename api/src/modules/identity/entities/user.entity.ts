import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { RoleAssignment } from './role-assignment.entity';
import { KycProfile } from './kyc-profile.entity';
import { PasswordCredential } from './password-credential.entity';
import { ExternalIdentity } from './external-identity.entity';

export enum UserStatus {
  PENDING_EMAIL_VERIFICATION = 'PENDING_EMAIL_VERIFICATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DISABLED = 'DISABLED',
}

@Entity({ schema: 'identity', name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'username', type: 'varchar', length: 50, unique: true })
  username!: string;

  @Column({ name: 'email', type: 'citext', unique: true })
  email!: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: true })
  firstName?: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  lastName?: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone?: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_EMAIL_VERIFICATION,
  })
  status!: UserStatus;

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // --- Relations ---
  @OneToOne(() => PasswordCredential, (cred) => cred.user, { cascade: true })
  passwordCredential?: PasswordCredential;

  @OneToMany(() => ExternalIdentity, (extId) => extId.user, { cascade: true })
  externalIdentities!: ExternalIdentity[];

  @OneToMany(() => RoleAssignment, (assignment) => assignment.user)
  roleAssignments!: RoleAssignment[];

  @OneToOne(() => KycProfile, (kyc) => kyc.user)
  kycProfile?: KycProfile;
}
