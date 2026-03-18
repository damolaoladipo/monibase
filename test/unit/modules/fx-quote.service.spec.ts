import { FxQuoteService } from '../../../src/modules/fx/fx-quote.service';
import { FxRatesService } from '../../../src/modules/fx/fx-rates.service';

describe('FxQuoteService', () => {
  let service: FxQuoteService;
  let fxRates: jest.Mocked<Pick<FxRatesService, 'getRateWithContext'>>;

  beforeEach(() => {
    fxRates = {
      getRateWithContext: jest.fn(),
    };
    service = new FxQuoteService(fxRates as unknown as FxRatesService);
  });

  it('buildQuotes returns monibase quote with instant delivery', async () => {
    fxRates.getRateWithContext.mockResolvedValue({
      rate: 0.00065,
      stale: false,
      updatedAt: '2025-01-01T00:00:00.000Z',
      rateBase: 'NGN',
    });
    const { quotes } = await service.buildQuotes('NGN', 'USD', 100000);
    expect(quotes).toHaveLength(1);
    expect(quotes[0].provider).toBe('monibase');
    expect(quotes[0].route).toEqual({ sourceCurrency: 'NGN', targetCurrency: 'USD' });
    expect(quotes[0].rate).toBe('0.00065000');
    expect(quotes[0].fee).toBe('0.0000');
    expect(quotes[0].delivery).toEqual({ min: 'PT0S', max: 'PT0S' });
    expect(quotes[0].sendAmount).toBe('100000.0000');
    expect(quotes[0].receivedAmount).toBe('65.0000');
  });

  it('buildQuoteDebug includes stale and midMarketRate', async () => {
    fxRates.getRateWithContext.mockResolvedValue({
      rate: 1.1,
      stale: true,
      updatedAt: '2025-01-02T00:00:00.000Z',
      rateBase: 'USD',
    });
    const debug = await service.buildQuoteDebug('USD', 'EUR');
    expect(debug.stale).toBe(true);
    expect(debug.midMarketRate).toBe('1.10000000');
    expect(debug.markupPercent).toBe(0);
    expect(debug.source).toBe('external_fx_api');
  });
});
