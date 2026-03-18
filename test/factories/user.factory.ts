import { User } from '../../src/modules/user/entities/user.entity';
import { UserRole } from '../../src/modules/user/entities/user.entity';
import { OtpType } from '../../src/modules/user/entities/user.entity';

/**
 * Build user-like data for tests (no save).
 */
export function buildUserData(overrides: Partial<User> = {}): Partial<User> {
  return {
    email: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
    password: 'hashed-placeholder',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
    tokenVersion: 0,
    isActive: true,
    isActivated: false,
    isLocked: false,
    lockedUntil: null,
    loginLimit: 0,
    otp: null,
    otpExpiry: null,
    otpType: null,
    lastLogin: null,
    ...overrides,
  };
}

export function buildUserDataActivated(overrides: Partial<User> = {}): Partial<User> {
  return buildUserData({ isActivated: true, isActive: true, ...overrides });
}

export function buildUserDataWithOtp(otp: string, type: string = OtpType.EMAIL_VERIFICATION): Partial<User> {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 15);
  return buildUserData({
    otp,
    otpExpiry: expiry,
    otpType: type,
  });
}
