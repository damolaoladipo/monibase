import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from '../../../src/modules/auth/token.service';

describe('TokenService', () => {
  let service: TokenService;
  const mockSign = jest.fn().mockReturnValue('signed-token');
  const mockVerify = jest.fn().mockReturnValue({
    sub: 'user-id',
    email: 'admin@monibase.so',
    role: 'user',
    isActivated: true,
    tokenVersion: 0,
  });
  const mockDecode = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDecode.mockReturnValue({
      sub: 'user-id',
      email: 'admin@monibase.so',
      role: 'user',
      isActivated: true,
      tokenVersion: 0,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: { sign: mockSign, verify: mockVerify, decode: mockDecode } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('7d') } },
      ],
    }).compile();

    service = module.get(TokenService);
  });

  describe('sign', () => {
    it('returns JWT from payload', () => {
      const token = service.sign({
        id: 'user-id',
        email: 'admin@monibase.so',
        role: 'user',
        isActivated: true,
        tokenVersion: 0,
      });
      expect(token).toBe('signed-token');
      expect(mockSign).toHaveBeenCalledWith(expect.objectContaining({
        sub: 'user-id',
        email: 'admin@monibase.so',
        role: 'user',
      }));
    });
  });

  describe('verify', () => {
    it('returns JwtPayload', () => {
      const payload = service.verify('valid-token');
      expect(payload).toMatchObject({ id: 'user-id', email: 'admin@monibase.so', role: 'user' });
    });
  });

  describe('decode', () => {
    it('returns payload when token valid', () => {
      const payload = service.decode('token');
      expect(payload).toMatchObject({ id: 'user-id', email: 'admin@monibase.so' });
    });
    it('returns null when decode throws', () => {
      mockDecode.mockImplementationOnce(() => {
        throw new Error('invalid');
      });
      const payload = service.decode('bad');
      expect(payload).toBeNull();
    });
  });
});
