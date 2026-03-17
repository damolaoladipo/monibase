import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Kyc } from './entities/kyc.entity';
import { KycRepository } from './kyc.repository';
import { KycService } from './kyc.service';

@Module({
  imports: [TypeOrmModule.forFeature([Kyc])],
  providers: [KycRepository, KycService],
  exports: [KycService],
})
export class KycModule {}
