import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { KycVerifiedGuard } from '../../common/guards/kyc-verified.guard';
import { ConvertDto } from './dto/convert.dto';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { TradeDto } from './dto/trade.dto';
import { TransferDto } from './dto/transfer.dto';
import { WalletService } from './wallet.service';

@ApiTags('wallet')
@ApiBearerAuth()
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

  @Post('convert')
  @UseGuards(KycVerifiedGuard)
  async convert(@CurrentUser() user: JwtPayload, @Body() dto: ConvertDto) {
    return this.walletService.convert(
      user.id,
      dto.sourceCurrency,
      dto.targetCurrency,
      dto.amount,
      dto.idempotencyKey,
    );
  }

  @Post('trade')
  @UseGuards(KycVerifiedGuard)
  async trade(@CurrentUser() user: JwtPayload, @Body() dto: TradeDto) {
    return this.walletService.trade(
      user.id,
      dto.sourceCurrency,
      dto.targetCurrency,
      dto.amount,
      dto.idempotencyKey,
    );
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer: same-user (fromCurrency/toCurrency) or P2P (toUserId, same currency)' })
  async transfer(@CurrentUser() user: JwtPayload, @Body() dto: TransferDto) {
    return this.walletService.transfer(user.id, dto);
  }
}
