import { WalletBalance } from '../../src/modules/wallet/entities/wallet-balance.entity';
import { Transaction } from '../../src/modules/wallet/entities/transaction.entity';
import { TransactionType, TransactionStatus } from '../../src/modules/wallet/entities/transaction.entity';

/**
 * Build wallet balance data for tests (no save).
 */
export function buildWalletBalanceData(
  userId: string,
  overrides: Partial<WalletBalance> = {},
): Partial<WalletBalance> {
  return {
    userId,
    currencyCode: 'USD',
    amount: '100.0000',
    ...overrides,
  };
}

/**
 * Build transaction data for tests (no save).
 */
export function buildTransactionData(
  userId: string,
  overrides: Partial<Transaction> = {},
): Partial<Transaction> {
  return {
    userId,
    type: TransactionType.FUND,
    amount: '100.0000',
    currencyCode: 'USD',
    sourceCurrency: null,
    targetCurrency: null,
    rate: null,
    status: TransactionStatus.SUCCESS,
    idempotencyKey: null,
    ...overrides,
  };
}
