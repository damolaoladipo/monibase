import { BadRequestException, Injectable } from '@nestjs/common';
import { TransactionStatus, TransactionType } from './entities/transaction.entity';
import { WalletRepository } from './wallet.repository';
import { isSupportedCurrency } from '../../common/constants/currencies';

@Injectable()
export class WalletService {
  constructor(private readonly walletRepo: WalletRepository) {}

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
}
