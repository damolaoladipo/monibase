import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { WalletService } from './wallet.service';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
@UseGuards(EmailVerifiedGuard)
export class TransactionsController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload, @Query() dto: ListTransactionsDto) {
    const fromDate = dto.fromDate ? new Date(dto.fromDate) : undefined;
    const toDate = dto.toDate ? new Date(dto.toDate) : undefined;
    return this.walletService.listTransactions(
      user.id,
      dto.page ?? 1,
      dto.limit ?? 20,
      dto.type,
      fromDate,
      toDate,
    );
  }
}
