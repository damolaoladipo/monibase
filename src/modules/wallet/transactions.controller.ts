import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { parseListQuery, buildListResult } from '../../common/query';
import { WalletService } from './wallet.service';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
@UseGuards(EmailVerifiedGuard)
export class TransactionsController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'List transactions. Query: select, sort, page, limit, type, fromDate, toDate' })
  async list(@CurrentUser() user: JwtPayload, @Query() query: Record<string, unknown>) {
    const parsed = parseListQuery(query);
    const type = (parsed.filter.type as string) || undefined;
    const fromDate = parsed.filter.fromDate
      ? new Date(parsed.filter.fromDate as string)
      : undefined;
    const toDate = parsed.filter.toDate
      ? new Date(parsed.filter.toDate as string)
      : undefined;
    const result = await this.walletService.listTransactions(
      user.id,
      parsed.page,
      parsed.limit,
      type,
      fromDate,
      toDate,
      parsed.sort.length ? parsed.sort : undefined,
    );
    return buildListResult(result.items, result.total, parsed);
  }
}
