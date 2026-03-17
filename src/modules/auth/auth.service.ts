import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { UserService } from '../user/user.service';
import { User } from '../user/entities/user.entity';
import { OtpType } from '../user/entities/user.entity';
import { TokenService } from './token.service';
import { EmailJobService } from '../email/email-job.service';
import { AuditLoggerService } from '../../common/services/audit-logger.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 15;
const LOCK_DURATION_MS = 30 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

/** Email regex (troott-api checkEmail pattern). */
const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
/** Password: 8+ chars, 1 upper, 1 lower, 1 digit, 1 special (troott-api checkPassword pattern). */
const PASSWORD_REGEX = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[^\w\s]).{8,}$/;

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly emailJobService: EmailJobService,
    private readonly audit: AuditLoggerService,
  ) {}

  /** Validates email format (troott-api checkEmail). */
  checkEmail(email: string): boolean {
    return EMAIL_REGEX.test(email ?? '');
  }

  /** Validates password strength (troott-api checkPassword). */
  checkPassword(password: string): boolean {
    return PASSWORD_REGEX.test(password ?? '');
  }

  /** Activate account and clear lock (troott-api activateAccount). */
  async activateAccount(user: User): Promise<void> {
    await this.userService.update(user.id, {
      isActivated: true,
      isActive: true,
      isLocked: false,
      loginLimit: 0,
      lockedUntil: null,
    });
  }

  /** Deactivate account (troott-api deactivateAccount). */
  async deactivateAccount(user: User): Promise<void> {
    await this.userService.update(user.id, {
      isActive: false,
      isActivated: false,
      isLocked: true,
      lockedUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
  }

  /** Returns true if user is currently locked (troott-api checkLockedStatus). Unlocks if lock expiry has passed. */
  async checkLockedStatus(user: User): Promise<boolean> {
    if (!user.isLocked || !user.lockedUntil) return false;
    if (new Date() > user.lockedUntil) {
      await this.userService.update(user.id, {
        isLocked: false,
        lockedUntil: null,
        loginLimit: 0,
      });
      return false;
    }
    return true;
  }

  /** Increment login attempts and lock account after MAX_LOGIN_ATTEMPTS (troott-api increaseLoginLimit). */
  async increaseLoginLimit(user: User): Promise<number> {
    const next = (user.loginLimit ?? 0) + 1;
    const updates: Partial<User> = {
      loginLimit: next,
      ...(next >= MAX_LOGIN_ATTEMPTS
        ? { isLocked: true, lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) }
        : {}),
    };
    await this.userService.update(user.id, updates);
    return next;
  }

  /** Update last login timestamp (troott-api updateLastLogin). */
  async updateLastLogin(user: User): Promise<void> {
    await this.userService.update(user.id, { lastLogin: new Date() });
  }

  generateOtp(): string {
    return randomBytes(OTP_LENGTH).toString('hex').slice(0, OTP_LENGTH).toUpperCase();
  }

  async register(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ message: string }> {
    const user = await this.userService.createUser({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
    });
    const otp = this.generateOtp();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + OTP_EXPIRY_MINUTES);
    await this.userService.update(user.id, {
      otp,
      otpExpiry: expiry,
      otpType: OtpType.EMAIL_VERIFICATION,
    });
    this.emailJobService.enqueueSendOtp({
      email: user.email,
      otp,
      type: OtpType.EMAIL_VERIFICATION,
    }).catch(() => {});
    this.audit.log({ userId: user.id, action: 'register', resource: 'auth', outcome: 'success' });
    return { message: 'Check email for OTP' };
  }

  async verifyOtp(email: string, otp: string, type: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid email or OTP');
    }
    if (!user.otp || !user.otpExpiry || user.otpType !== type) {
      throw new BadRequestException('Invalid email or OTP');
    }
    if (new Date() > user.otpExpiry) {
      throw new BadRequestException('OTP expired');
    }
    const normalizedOtp = otp.trim().toUpperCase();
    if (user.otp !== normalizedOtp) {
      throw new BadRequestException('Invalid email or OTP');
    }
    await this.userService.update(user.id, {
      otp: null,
      otpExpiry: null,
      otpType: null,
      isActivated: true,
      isActive: true,
    });
    this.audit.log({ userId: user.id, action: 'verify_otp', resource: 'auth', outcome: 'success' });
    return { message: 'Account verified' };
  }

  async login(user: User): Promise<{ token: string; user: JwtPayload }> {
    await this.updateLastLogin(user);
    this.audit.log({ userId: user.id, action: 'login', resource: 'auth', outcome: 'success' });
    const token = this.tokenService.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      isActivated: user.isActivated,
      tokenVersion: user.tokenVersion,
    });
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActivated: user.isActivated,
        tokenVersion: user.tokenVersion,
      },
    };
  }

  async logout(userId: string): Promise<{ message: string }> {
    const user = await this.userService.findById(userId);
    if (user) {
      await this.userService.update(userId, { tokenVersion: user.tokenVersion + 1 });
      this.audit.log({ userId, action: 'logout', resource: 'auth', outcome: 'success' });
    }
    return { message: 'Logged out' };
  }
}
