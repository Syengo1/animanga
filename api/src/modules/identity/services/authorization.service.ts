import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleAssignment } from '../entities/role-assignment.entity';

@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(RoleAssignment)
    private readonly roleAssignmentRepo: Repository<RoleAssignment>,
  ) {}

  // Future implementation: Check if user has permission in scope
}
