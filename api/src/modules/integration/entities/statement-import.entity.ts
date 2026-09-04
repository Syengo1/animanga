import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../identity/entities/user.entity';
import { StatementImportStatus } from '../enums/integration.enums';

@Entity({ schema: 'integration', name: 'statement_imports' })
export class StatementImport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @Column({
    name: 'provider_account',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  providerAccount?: string;

  @Column({ name: 'period_start', type: 'timestamptz', nullable: true })
  periodStart?: Date;

  @Column({ name: 'period_end', type: 'timestamptz', nullable: true })
  periodEnd?: Date;

  @Column({ name: 'file_hash', type: 'char', length: 64 })
  fileHash!: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'imported_by' })
  importedBy?: User;

  @CreateDateColumn({ name: 'imported_at' })
  importedAt!: Date;

  @Column({
    type: 'enum',
    enum: StatementImportStatus,
    default: StatementImportStatus.PROCESSING,
  })
  status!: StatementImportStatus;
}
