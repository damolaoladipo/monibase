import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { FxRatesService } from './fx-rates.service';
import { isSupportedCurrency } from '../../common/constants/currencies';
import { FxQuoteService } from './fx-quote.service';
import { FxQuotesQueryDto } from './dto/fx-quotes-query.dto';
import { FxQuotesResponseDto } from './dto/fx-quote-response.dto';

@ApiTags('fx')
@Controller('fx')
export class FxController {
  constructor(
    private readonly fxRatesService: FxRatesService,
    private readonly fxQuoteService: FxQuoteService,
  ) {}

  @Public()
  @Get('rates')
  @ApiOperation({ summary: 'Get current FX rates (optional base currency)' })
  async getRates(@Query('base') base?: string) {
    const baseCurrency = base && isSupportedCurrency(base) ? base : 'USD';
    return this.fxRatesService.getRates(baseCurrency);
  }

  @Public()
  @Get('quotes')
  @ApiOperation({
    summary: 'FX comparison quotes (Wise-style)',
    description:
      'Public price and instant delivery estimate for a currency route. Single provider (monibase); structure supports multiple providers later. Execution still requires verified user + KYC (admins exempt).',
  })
  @ApiOkResponse({ type: FxQuotesResponseDto })
  async getQuotes(@Query() query: FxQuotesQueryDto): Promise<FxQuotesResponseDto> {
    return this.fxQuoteService.buildQuotes(
      query.sourceCurrency,
      query.targetCurrency,
      query.amount,
    );
  }
}
