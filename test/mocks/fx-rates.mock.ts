/**
 * Mock FxRatesService for unit tests (no external API).
 */
export const mockGetRate = jest.fn().mockResolvedValue(1.2);
export const mockGetRates = jest.fn().mockResolvedValue({
  base: 'USD',
  rates: { NGN: 1500, EUR: 0.92, GBP: 0.79 },
  updatedAt: new Date().toISOString(),
});

export const createFxRatesServiceMock = () => ({
  getRate: mockGetRate,
  getRates: mockGetRates,
});
