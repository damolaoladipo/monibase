import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermissionsGuard } from '../../common/guards/require-permissions.guard';
import { StorageModule } from '../storage/storage.module';
import { Kyc } from './entities/kyc.entity';
import { KycRepository } from './kyc.repository';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { KycAdminController } from './kyc-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Kyc]), StorageModule],
  controllers: [KycController, KycAdminController],
  providers: [KycRepository, KycService, RolesGuard, RequirePermissionsGuard],
  exports: [KycService],
})
export class KycModule {}
