// C:\Projects\animanga-platform\api\src\modules\identity\services\user.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getProfileById(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: {
        roleAssignments: {
          role: {
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roles = Array.from(
      new Set(
        (user.roleAssignments || [])
          .map((ra) => ra.role?.code)
          .filter((code): code is string => Boolean(code)),
      ),
    );

    const permissions = Array.from(
      new Set(
        (user.roleAssignments || []).flatMap((ra) =>
          (ra.role?.permissions || []).map((p) => p.code),
        ),
      ),
    );

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      phone: user.phone ?? null,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      roles,
      permissions,
    };
  }
}
