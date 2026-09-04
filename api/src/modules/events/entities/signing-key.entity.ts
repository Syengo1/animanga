import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum KeyStatus {
  ACTIVE = 'ACTIVE',
  RETIRED = 'RETIRED',
  REVOKED = 'REVOKED',
}

@Entity('signing_keys', { schema: 'events' })
export class SigningKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, default: 'Ed25519' })
  algorithm: string;

  // Only the Public Key is stored in the DB for scanner distribution
  @Column({ name: 'public_key', type: 'text' })
  publicKey: string;

  @Column({ type: 'enum', enum: KeyStatus, default: KeyStatus.ACTIVE })
  status: KeyStatus;

  @Column({
    name: 'valid_from',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  validFrom: Date;

  @Column({ name: 'valid_to', type: 'timestamptz', nullable: true })
  validTo: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
