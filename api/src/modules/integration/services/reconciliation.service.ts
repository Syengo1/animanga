import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReconciliationCase } from '../entities/reconciliation-case.entity';

@Injectable()
export class ReconciliationService {
  constructor(
    @InjectRepository(ReconciliationCase)
    private readonly reconRepo: Repository<ReconciliationCase>,
  ) {}
}
