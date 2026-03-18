import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super-admin',
}

export enum OtpType {
  EMAIL_VERIFICATION = 'email_verification',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ name: 'first_name', default: '' })
  firstName: string;

  @Column({ name: 'last_name', default: '' })
  lastName: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 32, nullable: true })
  phoneNumber: string | null;

  @Column({ name: 'phone_code', type: 'varchar', length: 10, nullable: true })
  phoneCode: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: UserRole.USER,
  })
  role: string;

  @Column({ name: 'is_deactivated', default: false })
  isDeactivated: boolean;

  @Column({ name: 'token_version', default: 0 })
  tokenVersion: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_activated', default: false })
  isActivated: boolean;

  @Column({ name: 'is_locked', default: false })
  isLocked: boolean;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'login_limit', default: 0 })
  loginLimit: number;

  @Column({ type: 'varchar', length: 12, nullable: true })
  otp: string | null;

  @Column({ name: 'otp_expiry', type: 'timestamptz', nullable: true })
  otpExpiry: Date | null;

  @Column({ name: 'otp_type', type: 'varchar', nullable: true })
  otpType: string | null;

  @Column({ name: 'last_login', type: 'timestamptz', nullable: true })
  lastLogin: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
