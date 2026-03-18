import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { FxRatesService } from '../../../src/modules/fx/fx-rates.service';
import { SUPPORTED_CURRENCIES } from '../../../src/common/constants/currencies';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FxRatesService', () => {
  let service: FxRatesService;
  let config: ConfigService;

  const mockConfig = {
    get: jest.fn((key: string) => {
      const map: Record<string, string | number> = {
        FX_API_URL: 'https://api.exchangerate.test/v1',
        FX_API_KEY: 'test-key',
        FX_CACHE_TTL_SECONDS: 300,
      };
      return map[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        data: {
          base_code: 'USD',
          conversion_rates: { USD: 1, NGN: 1500, EUR: 0.92, GBP: 0.79 },
        },
      }),
    } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FxRatesService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(FxRatesService);
    config = module.get(ConfigService);
  });

  describe('getRates', () => {
    it('returns rates from API and caches', async () => {
      const clientGet = mockedAxios.create().get as jest.Mock;
      clientGet.mockResolvedValue({
        data: {
          base_code: 'USD',
          conversion_rates: { USD: 1, NGN: 1500, EUR: 0.92, GBP: 0.79 },
        },
      });
      const result = await service.getRates('USD');
      expect(result.base).toBe('USD');
      expect(result.rates).toHaveProperty('NGN', 1500);
      expect(result.rates).toHaveProperty('EUR', 0.92);
    });
  });

  describe('getRate', () => {
    it('returns 1 for same currency', async () => {
      const rate = await service.getRate('USD', 'USD');
      expect(rate).toBe(1);
    });
    it('returns rate from getRates for pair', async () => {
      (service as any).cache = new Map();
      (service as any).cache.set('fx:rates:USD', {
        data: {
          base: 'USD',
          rates: { NGN: 1500, EUR: 0.92, GBP: 0.79 },
          updatedAt: new Date().toISOString(),
        },
        expiresAt: Date.now() + 300000,
      });
      const rate = await service.getRate('USD', 'NGN');
      expect(rate).toBe(1500);
    });
  });
});
