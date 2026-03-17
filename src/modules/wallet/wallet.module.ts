import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KycVerifiedGuard } from '../../common/guards/kyc-verified.guard';
import { WalletBalance } from './entities/wallet-balance.entity';
import { Transaction } from './entities/transaction.entity';
import { IdempotencyRecord } from './entities/idempotency-record.entity';
import { KycModule } from '../kyc/kyc.module';
import { FxModule } from '../fx/fx.module';
import { WalletRepository } from './wallet.repository';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletBalance, Transaction, IdempotencyRecord]),
    FxModule,
    KycModule,
  ],
  controllers: [WalletController],
  providers: [WalletRepository, WalletService, KycVerifiedGuard],
  exports: [WalletService, WalletRepository],
})
export class WalletModule {}

