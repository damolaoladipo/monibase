import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletBalance } from './entities/wallet-balance.entity';
import { Transaction } from './entities/transaction.entity';
import { IdempotencyRecord } from './entities/idempotency-record.entity';
import { WalletRepository } from './wallet.repository';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletBalance, Transaction, IdempotencyRecord]),
  ],
  controllers: [WalletController],
  providers: [WalletRepository, WalletService],
  exports: [WalletService, WalletRepository],
})
export class WalletModule {}
