import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { KycService } from './kyc.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';

@ApiTags('kyc')
@ApiBearerAuth()
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
