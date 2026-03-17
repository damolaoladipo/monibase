import { BadRequestException, Injectable } from '@nestjs/common';
import { TransactionStatus, TransactionType } from './entities/transaction.entity';
import { WalletRepository } from './wallet.repository';
import { FxRatesService } from '../fx/fx-rates.service';
import { isSupportedCurrency } from '../../common/constants/currencies';
import { validateTradePair } from './dto/trade.dto';

@Injectable()
export class WalletService {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly fxRatesService: FxRatesService,
  ) {}

  async getBalances(userId: string): Promise<{ currencyCode: string; amount: string }[]> {
    const balances = await this.walletRepo.getBalances(userId);
    return balances.map((b) => ({ currencyCode: b.currencyCode, amount: b.amount }));
  }

  async fund(
    userId: string,
    currency: string,
    amount: number,
    idempotencyKey?: string,
  ): Promise<{ balances: { currencyCode: string; amount: string }[]; transactionId: string }> {
    if (!isSupportedCurrency(currency)) {
      throw new BadRequestException('Unsupported currency');
    }
    const key = idempotencyKey?.trim();
    if (key) {
      const existing = await this.walletRepo.findIdempotency(key, userId);
      if (existing) {
        return existing.response as { balances: { currencyCode: string; amount: string }[]; transactionId: string };
      }
    }

    const dataSource = this.walletRepo.getDataSource();
    const result = await dataSource.transaction(async (manager) => {
      const amountStr = amount.toFixed(4);
      await this.walletRepo.createOrGetBalance(userId, currency, amountStr, manager);
      const tx = await this.walletRepo.createTransaction(
        {
          userId,
          type: TransactionType.FUND,
          amount: amountStr,
          currencyCode: currency,
          status: TransactionStatus.SUCCESS,
          idempotencyKey: key || null,
        },
        manager,
      );
      const balances = await this.walletRepo.getBalances(userId, manager);
      const response = {
        balances: balances.map((b) => ({ currencyCode: b.currencyCode, amount: b.amount })),
        transactionId: tx.id,
      };
      if (key) {
        await this.walletRepo.saveIdempotency(key, userId, response, manager);
      }
      return response;
    });

    return result;
  }

  private async convertOrTrade(
    userId: string,
    sourceCurrency: string,
    targetCurrency: string,
    amount: number,
    idempotencyKey: string | undefined,
    type: TransactionType.CONVERSION | TransactionType.TRADE,
  ): Promise<{ balances: { currencyCode: string; amount: string }[]; transactionId: string }> {
    if (!isSupportedCurrency(sourceCurrency) || !isSupportedCurrency(targetCurrency)) {
      throw new BadRequestException('Unsupported currency');
    }
    if (sourceCurrency === targetCurrency) {
      throw new BadRequestException('Source and target currency must differ');
    }
    const key = idempotencyKey?.trim();
    if (key) {
      const existing = await this.walletRepo.findIdempotency(key, userId);
      if (existing) {
        return existing.response as { balances: { currencyCode: string; amount: string }[]; transactionId: string };
      }
    }

    const rate = await this.fxRatesService.getRate(sourceCurrency, targetCurrency);
    const amountStr = amount.toFixed(4);
    const targetAmount = (amount * rate).toFixed(4);

    const dataSource = this.walletRepo.getDataSource();
    const result = await dataSource.transaction(async (manager) => {
      await this.walletRepo.debitBalance(userId, sourceCurrency, amountStr, manager);
      await this.walletRepo.createOrGetBalance(userId, targetCurrency, targetAmount, manager);
      const tx = await this.walletRepo.createTransaction(
        {
          userId,
          type,
          amount: amountStr,
          sourceCurrency,
          targetCurrency,
          rate: rate.toFixed(8),
          status: TransactionStatus.SUCCESS,
          idempotencyKey: key || null,
        },
        manager,
      );
      const balances = await this.walletRepo.getBalances(userId, manager);
      const response = {
        balances: balances.map((b) => ({ currencyCode: b.currencyCode, amount: b.amount })),
        transactionId: tx.id,
      };
      if (key) {
        await this.walletRepo.saveIdempotency(key, userId, response, manager);
      }
      return response;
    }).catch((err) => {
      if (err.message === 'Insufficient balance') {
        throw new BadRequestException('Insufficient balance');
      }
      throw err;
    });

    return result;
  }

  async convert(
    userId: string,
    sourceCurrency: string,
    targetCurrency: string,
    amount: number,
    idempotencyKey?: string,
  ): Promise<{ balances: { currencyCode: string; amount: string }[]; transactionId: string }> {
    return this.convertOrTrade(userId, sourceCurrency, targetCurrency, amount, idempotencyKey, TransactionType.CONVERSION);
  }

  async trade(
    userId: string,
    sourceCurrency: string,
    targetCurrency: string,
    amount: number,
    idempotencyKey?: string,
  ): Promise<{ balances: { currencyCode: string; amount: string }[]; transactionId: string }> {
    try {
      validateTradePair(sourceCurrency, targetCurrency);
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : 'Invalid trade pair');
    }
    return this.convertOrTrade(userId, sourceCurrency, targetCurrency, amount, idempotencyKey, TransactionType.TRADE);
  }
}
