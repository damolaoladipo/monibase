import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('idempotency_records')
export class IdempotencyRecord {
  @PrimaryColumn({ name: 'user_id' })
  userId: string;

  @PrimaryColumn()
  key: string;

  @Column({ type: 'jsonb' })
  response: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
