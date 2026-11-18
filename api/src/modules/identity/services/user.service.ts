// C:\Projects\animanga-platform\api\src\modules\identity\services\user.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateProfileInput } from '../schemas/user.schema';

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
        passwordCredential: true,
        externalIdentities: true,
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

    const linkedProviders = Array.from(
      new Set((user.externalIdentities || []).map((ext) => ext.provider)),
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
      hasPassword: Boolean(user.passwordCredential),
      linkedProviders,
      roles,
      permissions,
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (input.firstName !== undefined) {
      user.firstName = input.firstName.trim() || undefined;
    }
    if (input.lastName !== undefined) {
      user.lastName = input.lastName.trim() || undefined;
    }
    if (input.phone !== undefined) {
      user.phone = input.phone.trim() || undefined;
    }

    await this.userRepo.save(user);
    return this.getProfileById(userId);
  }
}
