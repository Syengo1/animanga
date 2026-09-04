import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RoleAssignment } from './entities/role-assignment.entity';
import { KycProfile } from './entities/kyc-profile.entity';
import { KycVerificationCase } from './entities/kyc-verification-case.entity';
import { KycDocument } from './entities/kyc-document.entity';
import { AuditLog } from './entities/audit-log.entity';

import { AuthorizationService } from './services/authorization.service';
import { AuditService } from './services/audit.service';
import { UserService } from './services/user.service';
import { KycService } from './services/kyc.service';
import { AuthService } from './services/auth.service';

import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { AdminKycController } from './controllers/admin-kyc.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      Permission,
      RoleAssignment,
      KycProfile,
      KycVerificationCase,
      KycDocument,
      AuditLog,
    ]),
    JwtModule.register({
      global: true, // Makes JwtService available globally (e.g., in Guards)
      secret: process.env.JWT_SECRET || 'super_secret_animanga_key_2026',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController, UserController, AdminKycController],
  providers: [
    AuthorizationService,
    AuditService,
    UserService,
    KycService,
    AuthService,
  ],
  exports: [AuthorizationService, AuditService, UserService, KycService],
})
export class IdentityModule {}
