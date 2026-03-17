import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(EmailVerifiedGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  async getBalances(@CurrentUser() user: JwtPayload) {
    return this.walletService.getBalances(user.id);
  }

  @Post('fund')
  async fund(@CurrentUser() user: JwtPayload, @Body() dto: FundWalletDto) {
    return this.walletService.fund(
      user.id,
      dto.currency,
      dto.amount,
      dto.idempotencyKey,
    );
  }
}
