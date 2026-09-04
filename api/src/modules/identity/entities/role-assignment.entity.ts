import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Role } from './role.entity';
import { RoleScopeType } from '../enums/identity.enums';

// @Unique decorators removed; PostgreSQL partial indexes control the constraints.
@Entity({ schema: 'identity', name: 'role_assignments' })
export class RoleAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Role, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @Column({ name: 'scope_type', type: 'enum', enum: RoleScopeType })
  scopeType!: RoleScopeType;

  @Column({ name: 'scope_id', type: 'uuid', nullable: true })
  scopeId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_by' })
  assignedBy?: User;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt!: Date;
}
