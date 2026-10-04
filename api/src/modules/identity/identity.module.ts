import { Module, Global } from '@nestjs/common'; // <-- NEW: Import Global
import { TypeOrmModule } from '@nestjs/typeorm';
// Removed JwtModule as it is no longer used

import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RoleAssignment } from './entities/role-assignment.entity';
import { KycProfile } from './entities/kyc-profile.entity';
import { KycVerificationCase } from './entities/kyc-verification-case.entity';
import { KycDocument } from './entities/kyc-document.entity';
import { AuditLog } from './entities/audit-log.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { PasswordCredential } from './entities/password-credential.entity';
import { ExternalIdentity } from './entities/external-identity.entity';
import { Session } from './entities/session.entity';

import { AuthorizationService } from './services/authorization.service';
import { AuditService } from './services/audit.service';
import { UserService } from './services/user.service';
import { KycService } from './services/kyc.service';
import { AuthService } from './services/auth.service';
import { SessionService } from './services/session.service';

import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { AdminKycController } from './controllers/admin-kyc.controller';

@Global() // <-- NEW: Makes SessionService available to all guards automatically
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
      EmailVerificationToken,
      PasswordCredential,
      ExternalIdentity,
      Session,
    ]),
  ],
  controllers: [AuthController, UserController, AdminKycController],
  providers: [
    AuthorizationService,
    AuditService,
    UserService,
    KycService,
    AuthService,
    SessionService,
  ],
  exports: [
    AuthorizationService,
    AuditService,
    UserService,
    KycService,
    SessionService,
  ],
})
export class IdentityModule {}
