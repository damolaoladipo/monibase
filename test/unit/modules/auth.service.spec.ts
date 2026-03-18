import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UserService } from '../../../src/modules/user/user.service';
import { TokenService } from '../../../src/modules/auth/token.service';
import { EmailJobService } from '../../../src/modules/email/email-job.service';
import { AuditLoggerService } from '../../../src/common/services/audit-logger.service';
import { User } from '../../../src/modules/user/entities/user.entity';
import { createEmailJobServiceMock } from '../../mocks/email.service.mock';
import { buildUserData, buildUserDataActivated, buildUserDataWithOtp } from '../../factories/user.factory';

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let tokenService: TokenService;

  const mockUserService = {
    createUser: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockTokenService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockAudit = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const emailMock = createEmailJobServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: EmailJobService, useValue: emailMock },
        { provide: AuditLoggerService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(AuthService);
    userService = module.get(UserService);
    tokenService = module.get(TokenService);
  });

  describe('checkEmail', () => {
    it('accepts valid email', () => {
      expect(service.checkEmail('admin@monibase.so')).toBe(true);
      expect(service.checkEmail('user@monibase.so')).toBe(true);
    });
    it('rejects invalid email', () => {
      expect(service.checkEmail('')).toBe(false);
      expect(service.checkEmail('no-at')).toBe(false);
      expect(service.checkEmail('@nodomain.monibase.so')).toBe(false);
    });
  });

  describe('checkPassword', () => {
    it('accepts strong password', () => {
      expect(service.checkPassword('Test@1234')).toBe(true);
      expect(service.checkPassword('Abc1!xyz')).toBe(true);
    });
    it('rejects weak password', () => {
      expect(service.checkPassword('short')).toBe(false);
      expect(service.checkPassword('NoDigit!')).toBe(false);
      expect(service.checkPassword('noupper1!')).toBe(false);
      expect(service.checkPassword('NOLOWER1!')).toBe(false);
      expect(service.checkPassword('NoSpecial1')).toBe(false);
    });
  });

  describe('activateAccount', () => {
    it('updates user to activated', async () => {
      const user = { id: 'uid', email: 'admin@monibase.so' } as User;
      mockUserService.update.mockResolvedValue(user);
      await service.activateAccount(user);
      expect(mockUserService.update).toHaveBeenCalledWith(user.id, expect.objectContaining({
        isActivated: true,
        isActive: true,
        isLocked: false,
        loginLimit: 0,
        lockedUntil: null,
      }));
    });
  });

  describe('deactivateAccount', () => {
    it('updates user to deactivated', async () => {
      const user = { id: 'uid' } as User;
      mockUserService.update.mockResolvedValue(user);
      await service.deactivateAccount(user);
      expect(mockUserService.update).toHaveBeenCalledWith(user.id, expect.objectContaining({
        isActive: false,
        isActivated: false,
        isLocked: true,
      }));
      expect(mockUserService.update.mock.calls[0][1].lockedUntil).toBeInstanceOf(Date);
    });
  });

  describe('checkLockedStatus', () => {
    it('returns false when not locked', async () => {
      const user = { id: 'uid', isLocked: false } as User;
      expect(await service.checkLockedStatus(user)).toBe(false);
    });
    it('returns true when locked and not expired', async () => {
      const user = {
        id: 'uid',
        isLocked: true,
        lockedUntil: new Date(Date.now() + 60000),
      } as User;
      expect(await service.checkLockedStatus(user)).toBe(true);
    });
    it('unlocks and returns false when lock expired', async () => {
      const user = {
        id: 'uid',
        isLocked: true,
        lockedUntil: new Date(Date.now() - 1000),
      } as User;
      mockUserService.update.mockResolvedValue(user);
      expect(await service.checkLockedStatus(user)).toBe(false);
      expect(mockUserService.update).toHaveBeenCalledWith(user.id, expect.objectContaining({
        isLocked: false,
        lockedUntil: null,
        loginLimit: 0,
      }));
    });
  });

  describe('increaseLoginLimit', () => {
    it('increments loginLimit and locks after 5', async () => {
      const user = { id: 'uid', loginLimit: 3 } as User;
      mockUserService.update.mockResolvedValue(user);
      const next = await service.increaseLoginLimit(user);
      expect(next).toBe(4);
      expect(mockUserService.update).toHaveBeenCalledWith(user.id, expect.objectContaining({ loginLimit: 4 }));

      mockUserService.update.mockClear();
      const user4 = { id: 'uid', loginLimit: 4 } as User;
      mockUserService.update.mockResolvedValue(user4);
      const next5 = await service.increaseLoginLimit(user4);
      expect(next5).toBe(5);
      expect(mockUserService.update).toHaveBeenCalledWith(user4.id, expect.objectContaining({
        loginLimit: 5,
        isLocked: true,
      }));
      expect(mockUserService.update.mock.calls[0][1].lockedUntil).toBeInstanceOf(Date);
    });
  });

  describe('generateOtp', () => {
    it('returns 6-char string', () => {
      const otp = service.generateOtp();
      expect(otp).toHaveLength(6);
      expect(/^[A-Z0-9]+$/.test(otp)).toBe(true);
    });
  });

  describe('verifyOtp', () => {
    it('throws when user not found', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      await expect(service.verifyOtp('admin@monibase.so', '123456', 'email_verification'))
        .rejects.toThrow(BadRequestException);
    });
    it('throws when OTP expired', async () => {
      const user = buildUserDataWithOtp('123456') as User;
      user.otpExpiry = new Date(Date.now() - 1000);
      user.id = 'uid';
      mockUserService.findByEmail.mockResolvedValue(user);
      await expect(service.verifyOtp('admin@monibase.so', '123456', 'email_verification'))
        .rejects.toThrow(BadRequestException);
    });
    it('throws when OTP mismatch', async () => {
      const user = buildUserDataWithOtp('123456') as User;
      user.id = 'uid';
      mockUserService.findByEmail.mockResolvedValue(user);
      await expect(service.verifyOtp('admin@monibase.so', '999999', 'email_verification'))
        .rejects.toThrow(BadRequestException);
    });
    it('activates user and clears OTP on success', async () => {
      const user = buildUserDataWithOtp('123456') as User;
      user.id = 'uid';
      user.email = 'admin@monibase.so';
      mockUserService.findByEmail.mockResolvedValue(user);
      mockUserService.update.mockResolvedValue({ ...user, isActivated: true });
      const result = await service.verifyOtp('admin@monibase.so', '123456', 'email_verification');
      expect(result).toEqual({ message: 'Account verified' });
      expect(mockUserService.update).toHaveBeenCalledWith(user.id, expect.objectContaining({
        otp: null,
        otpExpiry: null,
        otpType: null,
        isActivated: true,
        isActive: true,
      }));
    });
  });

  describe('login', () => {
    it('returns token and user payload', async () => {
      const user = buildUserDataActivated() as User;
      user.id = 'uid';
      user.email = 'admin@monibase.so';
      user.role = 'user';
      user.isActivated = true;
      user.tokenVersion = 0;
      mockUserService.update.mockResolvedValue(user);
      const result = await service.login(user);
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user).toMatchObject({ id: user.id, email: user.email, role: user.role });
      expect(mockTokenService.sign).toHaveBeenCalledWith(expect.objectContaining({
        id: user.id,
        email: user.email,
        role: user.role,
      }));
    });
  });

  describe('logout', () => {
    it('bumps tokenVersion', async () => {
      const user = { id: 'uid', tokenVersion: 1 } as User;
      mockUserService.findById.mockResolvedValue(user);
      mockUserService.update.mockResolvedValue(user);
      const result = await service.logout('uid');
      expect(result.message).toBe('Logged out');
      expect(mockUserService.update).toHaveBeenCalledWith('uid', { tokenVersion: 2 });
    });
  });
});
