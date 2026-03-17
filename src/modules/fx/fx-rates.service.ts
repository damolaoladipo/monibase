import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { SUPPORTED_CURRENCIES } from '../../common/constants/currencies';

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

export interface FxRatesResponse {
  base: string;
  rates: Record<string, number>;
  updatedAt: string;
  stale?: boolean;
}

interface CacheEntry {
  data: FxRatesResponse;
  expiresAt: number;
}

@Injectable()
export class FxRatesService {
  private readonly client: AxiosInstance;
  private readonly cacheTtlMs: number;
  private cache: Map<string, CacheEntry> = new Map();
  private lastStale: FxRatesResponse | null = null;

  constructor(private readonly config: ConfigService) {
    const baseURL = this.config.get<string>('FX_API_URL');
    const apiKey = this.config.get<string>('FX_API_KEY');
    this.cacheTtlMs = (this.config.get<number>('FX_CACHE_TTL_SECONDS') ?? 300) * 1000;

    this.client = axios.create({
      baseURL,
      timeout: 10000,
      params: apiKey ? { apiKey } : undefined,
    });
  }

  private async fetchFromApi(base: string): Promise<FxRatesResponse> {
    const apiKey = this.config.get<string>('FX_API_KEY');
    const path = apiKey ? `/${apiKey}/latest/${base}` : `/latest/${base}`;
    const res = await this.client.get<{
      result?: string;
      base_code?: string;
      rates?: Record<string, number>;
      conversion_rates?: Record<string, number>;
    }>(path);

    const data = res.data;
    const ratesMap = data?.rates ?? data?.conversion_rates;
    if (!ratesMap) {
      throw new Error('Invalid FX API response');
    }

    const rates: Record<string, number> = {};
    for (const code of SUPPORTED_CURRENCIES) {
      if (code !== base && ratesMap[code] != null) {
        rates[code] = Number(ratesMap[code]);
      }
    }

    return {
      base: data.base_code ?? base,
      rates,
      updatedAt: new Date().toISOString(),
    };
  }

  private async fetchWithRetry(base: string): Promise<FxRatesResponse> {
    let lastError: Error | null = null;
    for (let i = 0; i < RETRY_ATTEMPTS; i++) {
      try {
        return await this.fetchFromApi(base);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (i < RETRY_ATTEMPTS - 1) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }
    throw lastError ?? new Error('FX fetch failed');
  }

  async getRates(base = 'USD'): Promise<FxRatesResponse> {
    const cacheKey = `fx:rates:${base}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    try {
      const data = await this.fetchWithRetry(base);
      this.cache.set(cacheKey, {
        data,
        expiresAt: now + this.cacheTtlMs,
      });
      this.lastStale = data;
      return data;
    } catch {
      if (this.lastStale) {
        return { ...this.lastStale, stale: true };
      }
      throw new ServiceUnavailableException('FX rates temporarily unavailable');
    }
  }

  async getRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) return 1;
    const response = await this.getRates(fromCurrency);
    const rate = response.rates[toCurrency];
    if (rate == null) {
      throw new ServiceUnavailableException(`Rate not available for ${fromCurrency}/${toCurrency}`);
    }
    return rate;
  }
}
