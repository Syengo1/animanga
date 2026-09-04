import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Account } from './entities/account.entity';
import { LedgerTransaction } from './entities/ledger-transaction.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';

// Services
import { LedgerService } from './services/ledger.service';

@Module({
  imports: [
    // Register the entities so TypeORM knows about them in this scope
    TypeOrmModule.forFeature([Account, LedgerTransaction, LedgerEntry]),
  ],
  providers: [LedgerService],
  // We export LedgerService so the Commerce and Event modules can use it
  exports: [LedgerService],
})
export class FinanceModule {}
