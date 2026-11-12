// C:\Projects\animanga-platform\api\src\modules\identity\services\authorization.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleAssignment } from '../entities/role-assignment.entity';
import { RoleScopeType } from '../enums/identity.enums';

@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(RoleAssignment)
    private readonly roleAssignmentRepo: Repository<RoleAssignment>,
  ) {}

  async hasPermission(
    userId: string,
    permissionCode: string,
    scopeType: RoleScopeType = RoleScopeType.GLOBAL,
    scopeId?: string,
  ): Promise<boolean> {
    const qb = this.roleAssignmentRepo
      .createQueryBuilder('ra')
      .innerJoin('ra.role', 'role')
      .innerJoin('role.permissions', 'perm')
      .where('ra.user_id = :userId', { userId })
      .andWhere('perm.code = :permissionCode', { permissionCode });

    if (scopeType === RoleScopeType.GLOBAL) {
      qb.andWhere('ra.scopeType = :scopeType', {
        scopeType: RoleScopeType.GLOBAL,
      });
    } else {
      qb.andWhere(
        '(ra.scopeType = :globalScope OR (ra.scopeType = :scopeType AND ra.scopeId = :scopeId))',
        {
          globalScope: RoleScopeType.GLOBAL,
          scopeType,
          scopeId,
        },
      );
    }

    const count = await qb.getCount();
    return count > 0;
  }
}
