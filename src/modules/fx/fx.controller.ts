import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { FxRatesService } from './fx-rates.service';
import { isSupportedCurrency } from '../../common/constants/currencies';

@Controller('fx')
export class FxController {
  constructor(private readonly fxRatesService: FxRatesService) {}

  @Public()
  @Get('rates')
  async getRates(@Query('base') base?: string) {
    const baseCurrency = base && isSupportedCurrency(base) ? base : 'USD';
    return this.fxRatesService.getRates(baseCurrency);
  }
}
