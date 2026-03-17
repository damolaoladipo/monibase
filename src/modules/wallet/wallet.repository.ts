import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { WalletBalance } from './entities/wallet-balance.entity';
import { Transaction } from './entities/transaction.entity';
import { IdempotencyRecord } from './entities/idempotency-record.entity';

export interface ListTransactionsOptions {
  userId: string;
  page?: number;
  limit?: number;
  type?: string;
  fromDate?: Date;
  toDate?: Date;
}

@Injectable()
export class WalletRepository {
  constructor(
    @InjectRepository(WalletBalance)
    private readonly balanceRepo: Repository<WalletBalance>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(IdempotencyRecord)
    private readonly idempotencyRepo: Repository<IdempotencyRecord>,
    private readonly dataSource: DataSource,
  ) {}

  async getBalances(userId: string, manager?: EntityManager): Promise<WalletBalance[]> {
    const repo = manager ? manager.getRepository(WalletBalance) : this.balanceRepo;
    return repo.find({
      where: { userId },
      order: { currencyCode: 'ASC' },
    });
  }

  async findBalance(userId: string, currencyCode: string, manager?: EntityManager): Promise<WalletBalance | null> {
    const repo = manager ? manager.getRepository(WalletBalance) : this.balanceRepo;
    return repo.findOne({ where: { userId, currencyCode } });
  }

  async findBalanceForUpdate(userId: string, currencyCode: string, manager: EntityManager): Promise<WalletBalance | null> {
    return manager.getRepository(WalletBalance).findOne({
      where: { userId, currencyCode },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async createOrGetBalance(userId: string, currencyCode: string, amount: string, manager: EntityManager): Promise<WalletBalance> {
    const repo = manager.getRepository(WalletBalance);
    let balance = await repo.findOne({ where: { userId, currencyCode } });
    if (!balance) {
      balance = repo.create({ userId, currencyCode, amount });
      return repo.save(balance);
    }
    balance.amount = (parseFloat(balance.amount) + parseFloat(amount)).toFixed(4);
    return repo.save(balance);
  }

  async debitBalance(userId: string, currencyCode: string, amount: string, manager: EntityManager): Promise<WalletBalance> {
    const balance = await this.findBalanceForUpdate(userId, currencyCode, manager);
    if (!balance) {
      throw new Error('Insufficient balance');
    }
    const current = parseFloat(balance.amount);
    const debit = parseFloat(amount);
    if (current < debit) {
      throw new Error('Insufficient balance');
    }
    balance.amount = (current - debit).toFixed(4);
    return manager.getRepository(WalletBalance).save(balance);
  }

  async createTransaction(data: Partial<Transaction>, manager?: EntityManager): Promise<Transaction> {
    const repo = manager ? manager.getRepository(Transaction) : this.transactionRepo;
    const tx = repo.create(data);
    return repo.save(tx);
  }

  async findIdempotency(key: string, userId: string, manager?: EntityManager): Promise<IdempotencyRecord | null> {
    const repo = manager ? manager.getRepository(IdempotencyRecord) : this.idempotencyRepo;
    return repo.findOne({ where: { key, userId } });
  }

  async saveIdempotency(key: string, userId: string, response: Record<string, unknown>, manager?: EntityManager): Promise<IdempotencyRecord> {
    const repo = manager ? manager.getRepository(IdempotencyRecord) : this.idempotencyRepo;
    const record = repo.create({ key, userId, response });
    return repo.save(record);
  }

  async listTransactions(opts: ListTransactionsOptions): Promise<{ items: Transaction[]; total: number }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.transactionRepo
      .createQueryBuilder('t')
      .where('t.user_id = :userId', { userId: opts.userId });

    if (opts.type) {
      qb.andWhere('t.type = :type', { type: opts.type });
    }
    if (opts.fromDate) {
      qb.andWhere('t.created_at >= :fromDate', { fromDate: opts.fromDate });
    }
    if (opts.toDate) {
      qb.andWhere('t.created_at <= :toDate', { toDate: opts.toDate });
    }

    const [items, total] = await qb
      .orderBy('t.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }
}
