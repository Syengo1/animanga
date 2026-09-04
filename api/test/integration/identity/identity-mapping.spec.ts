/// <reference types="jest" />
/* eslint-disable */

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PostgresHarness } from '../../helpers/postgres.harness';
import { IdentityModule } from '../../../src/modules/identity/identity.module';

import { User } from '../../../src/modules/identity/entities/user.entity';
import { Role } from '../../../src/modules/identity/entities/role.entity';
import { RoleAssignment } from '../../../src/modules/identity/entities/role-assignment.entity';
import { AuditLog } from '../../../src/modules/identity/entities/audit-log.entity';
import { RoleScopeType } from '../../../src/modules/identity/enums/identity.enums';

describe('Identity Domain - TypeORM & Database Invariants', () => {
  let harness: PostgresHarness;
  let moduleRef: TestingModule;
  let dataSource: DataSource;

  beforeAll(async () => {
    // 1. Boot the Draft 06.2 Hardened Database
    harness = new PostgresHarness();
    await harness.start();

    // 2. We extract the dynamic host/port from the harness
    const host = (harness as any).container.getHost();
    const port = (harness as any).container.getPort();

    // 3. Boot the NestJS Identity Module exactly as it runs in Production
    // Notice we use the restricted 'animanga_app' user, NOT the admin!
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: host,
          port: port,
          username: 'animanga_app',
          password: 'app_password',
          database: 'animanga_test',
          autoLoadEntities: true,
          synchronize: false, // STRICTLY FALSE: We rely entirely on Draft 06.2
        }),
        IdentityModule,
      ],
    }).compile();

    dataSource = moduleRef.get(DataSource);
  }, 30000);

  afterAll(async () => {
    if (moduleRef) await moduleRef.close();
    if (harness) await harness.stop();
  });

  it('1. Successfully inserts a User and hides password hash on retrieval', async () => {
    const userRepo: Repository<User> = dataSource.getRepository(User);

    // Insert
    const user = userRepo.create({
      email: 'test@animanga.com',
      passwordHash: 'super_secret_hash',
      firstName: 'Test',
      lastName: 'User',
    });
    const saved = await userRepo.save(user);
    expect(saved.id).toBeDefined();

    // Retrieval - Proving select: false works
    const fetched = await userRepo.findOneBy({ id: saved.id });
    expect(fetched?.email).toBe('test@animanga.com');
    expect(fetched?.passwordHash).toBeUndefined(); // The hash should be invisible to normal queries!
  });

  it('2. Enforces RoleAssignment scope rules dynamically at the database level', async () => {
    const userRepo = dataSource.getRepository(User);
    const roleRepo = dataSource.getRepository(Role);
    const assignRepo = dataSource.getRepository(RoleAssignment);

    const user = await userRepo.findOneBy({ email: 'test@animanga.com' });
    const role = await roleRepo.save(
      roleRepo.create({ code: 'ADMIN', name: 'Platform Admin' }),
    );

    // VALID: GLOBAL scope with no scope_id
    await expect(
      assignRepo.save(
        assignRepo.create({ user, role, scopeType: RoleScopeType.GLOBAL }),
      ),
    ).resolves.toBeDefined();

    // INVALID: GLOBAL scope WITH a scope_id (Should be violently rejected by PostgreSQL CHECK constraint)
    await expect(
      assignRepo.save(
        assignRepo.create({
          user,
          role,
          scopeType: RoleScopeType.GLOBAL,
          scopeId: user?.id,
        }),
      ),
    ).rejects.toThrow(/violates check constraint/);

    // INVALID: EVENT scope WITHOUT a scope_id (Should be violently rejected)
    await expect(
      assignRepo.save(
        assignRepo.create({ user, role, scopeType: RoleScopeType.EVENT }),
      ),
    ).rejects.toThrow(/violates check constraint/);
  });

  it('3. The AuditLog entity maps correctly and enforces strict append-only rules', async () => {
    const auditRepo = dataSource.getRepository(AuditLog);
    const user = await dataSource
      .getRepository(User)
      .findOneBy({ email: 'test@animanga.com' });

    // 1. Appending works
    const log = await auditRepo.save(
      auditRepo.create({
        actor: user || undefined,
        action: 'CREATED_ROLE',
        entityType: 'ROLE',
        ipAddress: '192.168.1.1',
      }),
    );
    expect(log.id).toBeDefined();

    // 2. Updating is violently blocked by the PostgreSQL trigger
    log.action = 'TAMPERED_LOG';
    await expect(auditRepo.save(log)).rejects.toThrow(
      'Record is strictly immutable (append-only)',
    );

    // 3. Deletion is violently blocked
    await expect(auditRepo.remove(log)).rejects.toThrow(
      'Record is strictly immutable (append-only)',
    );
  });
});
