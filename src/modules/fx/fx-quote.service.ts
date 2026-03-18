import { Injectable } from '@nestjs/common';
import { FxRatesService } from './fx-rates.service';
import {
  FX_QUOTE_INSTANT_DELIVERY,
  FX_QUOTE_PROVIDER_MONIBASE,
} from './constants/fx-quote.constants';
import type { FxQuoteItemDto } from './dto/fx-quote-response.dto';

@Injectable()
export class FxQuoteService {
  constructor(private readonly fxRates: FxRatesService) {}

  async buildQuotes(
    sourceCurrency: string,
    targetCurrency: string,
    amount?: number,
  ): Promise<{ quotes: FxQuoteItemDto[] }> {
    const ctx = await this.fxRates.getRateWithContext(sourceCurrency, targetCurrency);
    const rate = ctx.rate;
    const received =
      amount != null ? (amount * rate).toFixed(4) : undefined;

    const quote: FxQuoteItemDto = {
      provider: FX_QUOTE_PROVIDER_MONIBASE,
      route: { sourceCurrency, targetCurrency },
      rate: rate.toFixed(8),
      fee: '0.0000',
      delivery: {
        min: FX_QUOTE_INSTANT_DELIVERY.min,
        max: FX_QUOTE_INSTANT_DELIVERY.max,
      },
    };
    if (amount != null) {
      quote.sendAmount = amount.toFixed(4);
      if (received != null) quote.receivedAmount = received;
    }
    return { quotes: [quote] };
  }

  async buildQuoteDebug(
    sourceCurrency: string,
    targetCurrency: string,
    amount?: number,
  ): Promise<{
    quotes: FxQuoteItemDto[];
    stale: boolean;
    updatedAt: string;
    rateBase: string;
    midMarketRate: string;
    markupPercent: number;
    source: string;
  }> {
    const ctx = await this.fxRates.getRateWithContext(sourceCurrency, targetCurrency);
    const rate = ctx.rate;
    const received =
      amount != null ? (amount * rate).toFixed(4) : undefined;

    const quote: FxQuoteItemDto = {
      provider: FX_QUOTE_PROVIDER_MONIBASE,
      route: { sourceCurrency, targetCurrency },
      rate: rate.toFixed(8),
      fee: '0.0000',
      delivery: {
        min: FX_QUOTE_INSTANT_DELIVERY.min,
        max: FX_QUOTE_INSTANT_DELIVERY.max,
      },
    };
    if (amount != null) {
      quote.sendAmount = amount.toFixed(4);
      if (received != null) quote.receivedAmount = received;
    }

    return {
      quotes: [quote],
      stale: ctx.stale ?? false,
      updatedAt: ctx.updatedAt,
      rateBase: ctx.rateBase,
      midMarketRate: rate.toFixed(8),
      markupPercent: 0,
      source: 'external_fx_api',
    };
  }
}
