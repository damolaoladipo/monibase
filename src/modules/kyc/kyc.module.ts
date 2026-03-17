import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Kyc } from './entities/kyc.entity';
import { KycRepository } from './kyc.repository';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { KycAdminController } from './kyc-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Kyc])],
  controllers: [KycController, KycAdminController],
  providers: [KycRepository, KycService, RolesGuard],
  exports: [KycService],
})
export class KycModule {}
