import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { FxRatesService } from './fx-rates.service';
import { isSupportedCurrency } from '../../common/constants/currencies';

@ApiTags('fx')
@Controller('fx')
export class FxController {
  constructor(private readonly fxRatesService: FxRatesService) {}

  @Public()
  @Get('rates')
  @ApiOperation({ summary: 'Get current FX rates (optional base currency)' })
  async getRates(@Query('base') base?: string) {
    const baseCurrency = base && isSupportedCurrency(base) ? base : 'USD';
    return this.fxRatesService.getRates(baseCurrency);
  }
}
