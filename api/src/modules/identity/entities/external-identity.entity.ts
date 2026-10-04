import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

export enum IdentityProvider {
  GOOGLE = 'GOOGLE',
  APPLE = 'APPLE',
}

@Entity({ schema: 'identity', name: 'external_identities' })
@Unique(['provider', 'providerSubject']) // strict enforcement from your plan
export class ExternalIdentity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.externalIdentities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'enum', enum: IdentityProvider })
  provider!: IdentityProvider;

  @Column({ name: 'provider_subject', type: 'varchar' })
  providerSubject!: string;

  @Column({ name: 'provider_email', type: 'citext', nullable: true })
  providerEmail?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
