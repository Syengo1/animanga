import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { KycProfile } from './kyc-profile.entity';

@Entity({ schema: 'identity', name: 'kyc_documents' })
export class KycDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => KycProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kyc_profile_id' })
  kycProfile!: KycProfile;

  @Column({ name: 'document_type', type: 'varchar', length: 100 })
  documentType!: string;

  @Column({ name: 'document_storage_key', type: 'text' })
  documentStorageKey!: string;

  @Column({ name: 'document_sha256', type: 'char', length: 64 })
  documentSha256!: string;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt!: Date;
}
