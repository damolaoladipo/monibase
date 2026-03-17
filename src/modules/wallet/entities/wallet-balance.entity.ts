import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('wallet_balances')
@Unique(['userId', 'currencyCode'])
export class WalletBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'currency_code', length: 3 })
  currencyCode: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  amount: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
