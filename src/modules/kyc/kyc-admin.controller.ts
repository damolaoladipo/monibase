import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { KycService } from './kyc.service';
import { ReviewKycDto } from './dto/review-kyc.dto';

@Controller('kyc/admin')
@UseGuards(RolesGuard)
@Roles('admin')
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
