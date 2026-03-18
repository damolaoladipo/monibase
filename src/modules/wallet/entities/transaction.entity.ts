import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum TransactionType {
  FUND = 'fund',
  CONVERSION = 'conversion',
  TRADE = 'trade',
  TRANSFER_OUT = 'transfer_out',
  TRANSFER_IN = 'transfer_in',
  TRANSFER = 'transfer',
}

export enum TransactionStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 20 })
  type: string;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  amount: string;

  @Column({ name: 'currency_code', type: 'varchar', length: 3, nullable: true })
  currencyCode: string | null;

  @Column({ name: 'source_currency', type: 'varchar', length: 3, nullable: true })
  sourceCurrency: string | null;

  @Column({ name: 'target_currency', type: 'varchar', length: 3, nullable: true })
  targetCurrency: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  rate: string | null;

  @Column({ type: 'varchar', length: 20, default: TransactionStatus.SUCCESS })
  status: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255, unique: true, nullable: true })
  idempotencyKey: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
