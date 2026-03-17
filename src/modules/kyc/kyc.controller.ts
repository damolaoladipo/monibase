import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { KycService } from './kyc.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('submit')
  async submit(@CurrentUser() user: JwtPayload, @Body() dto: SubmitKycDto) {
    return this.kycService.submit(user.id, {
      fullName: dto.fullName,
      dateOfBirth: dto.dateOfBirth,
      address: dto.address,
      idType: dto.idType,
      idNumber: dto.idNumber,
    });
  }

  @Get('status')
  async getStatus(@CurrentUser() user: JwtPayload) {
    return this.kycService.getStatus(user.id);
  }
}
