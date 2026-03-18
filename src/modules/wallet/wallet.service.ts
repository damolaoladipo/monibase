import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TransactionStatus, TransactionType } from './entities/transaction.entity';
import { WalletRepository } from './wallet.repository';
import { FxRatesService } from '../fx/fx-rates.service';
import { UserService } from '../user/user.service';
import { isSupportedCurrency } from '../../common/constants/currencies';
import { validateTradePair } from './dto/trade.dto';
import { AuditLoggerService } from '../../common/services/audit-logger.service';
import { WALLET_INSTANT_DELIVERY } from '../../common/constants/wallet-delivery';
import { TransferDto } from './dto/transfer.dto';

@Injectable()
export class WalletService {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly fxRatesService: FxRatesService,
    private readonly userService: UserService,
    private readonly audit: AuditLoggerService,
  ) {}

  async getBalances(userId: string): Promise<{ currencyCode: string; amount: string }[]> {
    let balances = await this.walletRepo.getBalances(userId);
    if (balances.length === 0) {
      await this.walletRepo.ensureDefaultWallet(userId);
      balances = await this.walletRepo.getBalances(userId);
    }
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

    this.audit.log({ userId, action: 'wallet_fund', resource: 'wallet', outcome: 'success' });
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
        delivery: WALLET_INSTANT_DELIVERY,
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

    const action = type === TransactionType.CONVERSION ? 'wallet_convert' : 'wallet_trade';
    this.audit.log({ userId, action, resource: 'wallet', outcome: 'success' });
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

  async transfer(
    userId: string,
    dto: TransferDto,
  ): Promise<{ balances: { currencyCode: string; amount: string }[]; transactionId: string }> {
    const key = dto.idempotencyKey?.trim();
    if (key) {
      const existing = await this.walletRepo.findIdempotency(key, userId);
      if (existing) {
        return existing.response as { balances: { currencyCode: string; amount: string }[]; transactionId: string };
      }
    }

    const fromCurrency = dto.fromCurrency;
    if (!isSupportedCurrency(fromCurrency)) {
      throw new BadRequestException('Unsupported fromCurrency');
    }
    const amountStr = Number(dto.amount).toFixed(4);

    if (dto.toUserId) {
      const toUser = await this.userService.findById(dto.toUserId);
      if (!toUser) {
        throw new NotFoundException('Recipient user not found');
      }
      if (dto.toUserId === userId) {
        throw new BadRequestException('Cannot transfer to yourself; use same-user transfer without toUserId');
      }
      const currency = fromCurrency;
      const dataSource = this.walletRepo.getDataSource();
      const result = await dataSource.transaction(async (manager) => {
        await this.walletRepo.debitBalance(userId, currency, amountStr, manager);
        await this.walletRepo.creditBalance(dto.toUserId!, currency, amountStr, manager);
        const txOut = await this.walletRepo.createTransaction(
          {
            userId,
            type: TransactionType.TRANSFER_OUT,
            amount: amountStr,
            currencyCode: currency,
            status: TransactionStatus.SUCCESS,
            idempotencyKey: key || null,
          },
          manager,
        );
        await this.walletRepo.createTransaction(
          {
            userId: dto.toUserId!,
            type: TransactionType.TRANSFER_IN,
            amount: amountStr,
            currencyCode: currency,
            status: TransactionStatus.SUCCESS,
            idempotencyKey: null,
          },
          manager,
        );
        const balances = await this.walletRepo.getBalances(userId, manager);
        const response = {
          balances: balances.map((b) => ({ currencyCode: b.currencyCode, amount: b.amount })),
          transactionId: txOut.id,
          delivery: WALLET_INSTANT_DELIVERY,
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
      this.audit.log({ userId, action: 'wallet_transfer', resource: 'wallet', outcome: 'success' });
      return result;
    }

    const toCurrency = dto.toCurrency ?? fromCurrency;
    if (!isSupportedCurrency(toCurrency)) {
      throw new BadRequestException('Unsupported toCurrency');
    }
    if (fromCurrency === toCurrency) {
      throw new BadRequestException('Same-user transfer requires different fromCurrency and toCurrency');
    }
    const rate = await this.fxRatesService.getRate(fromCurrency, toCurrency);
    const targetAmount = (Number(dto.amount) * rate).toFixed(4);
    const dataSource = this.walletRepo.getDataSource();
    const result = await dataSource.transaction(async (manager) => {
      await this.walletRepo.debitBalance(userId, fromCurrency, amountStr, manager);
      await this.walletRepo.creditBalance(userId, toCurrency, targetAmount, manager);
      const tx = await this.walletRepo.createTransaction(
        {
          userId,
          type: TransactionType.TRANSFER,
          amount: amountStr,
          sourceCurrency: fromCurrency,
          targetCurrency: toCurrency,
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
        delivery: WALLET_INSTANT_DELIVERY,
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
    this.audit.log({ userId, action: 'wallet_transfer', resource: 'wallet', outcome: 'success' });
    return result;
  }

  async listTransactions(
    userId: string,
    page: number,
    limit: number,
    type?: string,
    fromDate?: Date,
    toDate?: Date,
    sort?: { field: string; order: 'ASC' | 'DESC' }[],
  ): Promise<{ items: Array<{ id: string; type: string; amount: string; currencyCode: string | null; sourceCurrency: string | null; targetCurrency: string | null; rate: string | null; status: string; createdAt: Date }>; total: number; page: number; limit: number }> {
    const { items, total } = await this.walletRepo.listTransactions({
      userId,
      page,
      limit,
      sort,
      type,
      fromDate,
      toDate,
    });
    return {
      items: items.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        currencyCode: t.currencyCode,
        sourceCurrency: t.sourceCurrency,
        targetCurrency: t.targetCurrency,
        rate: t.rate,
        status: t.status,
        createdAt: t.createdAt,
      })),
      total,
      page,
      limit,
    };
  }
}
