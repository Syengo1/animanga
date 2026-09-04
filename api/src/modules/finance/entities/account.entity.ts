import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ schema: 'finance', name: 'accounts' })
export class Account {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'account_code', type: 'varchar', length: 50, unique: true })
  accountCode!: string;

  @Column({ name: 'account_type', type: 'varchar', length: 50 })
  accountType!: string;

  @Column({ type: 'varchar', length: 50 })
  classification!: string;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  // Using @Column instead of @CreateDateColumn to prevent TypeORM from auto-inserting it,
  // letting the Postgres DEFAULT now() handle it if the column exists, or ignoring it if not mapped.
  // We also make it optional (!) so TypeScript doesn't force us to seed it.
  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt?: Date;
}
