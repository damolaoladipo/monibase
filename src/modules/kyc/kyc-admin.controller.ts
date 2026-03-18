import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermissionsGuard } from '../../common/guards/require-permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Permission } from '../../configs/permissions.config';
import { ADMIN_ROLES } from '../../configs/roles.config';
import { KycService } from './kyc.service';
import { ReviewKycDto } from './dto/review-kyc.dto';

@Controller('kyc/admin')
@UseGuards(RolesGuard, RequirePermissionsGuard)
@Roles(...ADMIN_ROLES)
@RequirePermissions(Permission.KYC_LIST_PENDING, Permission.KYC_REVIEW)
export class KycAdminController {
  constructor(private readonly kycService: KycService) {}

  @Get('pending')
  async listPending() {
    return this.kycService.listPending();
  }

  @Post('review')
  async review(@Body() dto: ReviewKycDto) {
    return this.kycService.review(
      dto.kycId,
      dto.status as 'verified' | 'rejected',
      dto.rejectionReason,
    );
  }
}
