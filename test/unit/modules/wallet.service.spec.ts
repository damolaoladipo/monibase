import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WalletService } from '../../../src/modules/wallet/wallet.service';
import { WalletRepository } from '../../../src/modules/wallet/wallet.repository';
import { FxRatesService } from '../../../src/modules/fx/fx-rates.service';
import { UserService } from '../../../src/modules/user/user.service';
import { AuditLoggerService } from '../../../src/common/services/audit-logger.service';
import { createFxRatesServiceMock } from '../../mocks/fx-rates.mock';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepo: WalletRepository;
  let fxRatesService: FxRatesService;

  const mockGetDataSource = () => ({
    transaction: jest.fn((fn: (manager: unknown) => Promise<unknown>) => fn(mockManager)),
  });
  const mockManager = {
    getRepository: jest.fn(() => ({
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((d: unknown) => d),
      save: jest.fn((e: unknown) => Promise.resolve({ ...(e as object), id: 'tx-id' })),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      })),
    })),
  };

  const mockWalletRepo = {
    getBalances: jest.fn().mockResolvedValue([]),
    findIdempotency: jest.fn().mockResolvedValue(null),
    getDataSource: jest.fn(),
    createOrGetBalance: jest.fn().mockResolvedValue({}),
    debitBalance: jest.fn().mockResolvedValue({}),
    creditBalance: jest.fn().mockResolvedValue({}),
    createTransaction: jest.fn().mockResolvedValue({ id: 'tx-id' }),
    saveIdempotency: jest.fn().mockResolvedValue({}),
    listTransactions: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    ensureDefaultWallet: jest.fn().mockResolvedValue(undefined),
  };

  const mockUserService = {
    findById: jest.fn().mockResolvedValue({ id: 'user-2' }),
  };

  const mockAudit = { log: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockWalletRepo.getBalances.mockResolvedValue([{ currencyCode: 'USD', amount: '100.0000' }]);
    mockWalletRepo.getDataSource.mockImplementation(mockGetDataSource);
    mockUserService.findById.mockResolvedValue({ id: 'user-2' });
    const fxMock = createFxRatesServiceMock();
    fxMock.getRate.mockResolvedValue(1.2);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: WalletRepository, useValue: mockWalletRepo },
        { provide: FxRatesService, useValue: fxMock },
        { provide: UserService, useValue: mockUserService },
        { provide: AuditLoggerService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(WalletService);
    walletRepo = module.get(WalletRepository);
    fxRatesService = module.get(FxRatesService);
  });

  describe('getBalances', () => {
    it('returns balances from repo', async () => {
      mockWalletRepo.getBalances.mockResolvedValue([
        { currencyCode: 'USD', amount: '100.0000' },
        { currencyCode: 'NGN', amount: '0.0000' },
      ]);
      const result = await service.getBalances('user-1');
      expect(result).toEqual([
        { currencyCode: 'USD', amount: '100.0000' },
        { currencyCode: 'NGN', amount: '0.0000' },
      ]);
      expect(mockWalletRepo.ensureDefaultWallet).not.toHaveBeenCalled();
    });
    it('calls ensureDefaultWallet when no balances and returns at least NGN 0', async () => {
      mockWalletRepo.getBalances
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ currencyCode: 'NGN', amount: '0.0000' }]);
      const result = await service.getBalances('user-1');
      expect(mockWalletRepo.ensureDefaultWallet).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([{ currencyCode: 'NGN', amount: '0.0000' }]);
    });
  });

  describe('fund', () => {
    it('throws for unsupported currency', async () => {
      await expect(service.fund('user-1', 'XXX', 100)).rejects.toThrow(BadRequestException);
    });
    it('returns idempotent response when key already exists', async () => {
      const stored = {
        balances: [{ currencyCode: 'USD', amount: '50.0000' }],
        transactionId: 'old-tx',
      };
      mockWalletRepo.findIdempotency.mockResolvedValue({ response: stored });
      const result = await service.fund('user-1', 'USD', 50, 'same-key');
      expect(result).toEqual(stored);
      expect(mockWalletRepo.getDataSource).not.toHaveBeenCalled();
    });
    it('creates fund transaction and stores idempotency', async () => {
      mockWalletRepo.getBalances.mockResolvedValue([{ currencyCode: 'USD', amount: '100.0000' }]);
      const result = await service.fund('user-1', 'USD', 100, 'idem-key');
      expect(result).toHaveProperty('transactionId');
      expect(result.balances).toBeDefined();
    });
  });

  describe('convert', () => {
    it('throws when source and target are same', async () => {
      await expect(service.convert('user-1', 'USD', 'USD', 10)).rejects.toThrow(BadRequestException);
    });
    it('throws for unsupported currency', async () => {
      await expect(service.convert('user-1', 'USD', 'XXX', 10)).rejects.toThrow(BadRequestException);
    });
    it('returns idempotent response when key exists', async () => {
      const stored = {
        balances: [{ currencyCode: 'USD', amount: '0' }, { currencyCode: 'EUR', amount: '12.0000' }],
        transactionId: 'old-tx',
      };
      mockWalletRepo.findIdempotency.mockResolvedValue({ response: stored });
      const result = await service.convert('user-1', 'USD', 'EUR', 10, 'same-key');
      expect(result).toEqual(stored);
    });
    it('throws insufficient balance when debitBalance fails', async () => {
      mockWalletRepo.debitBalance.mockRejectedValue(new Error('Insufficient balance'));
      await expect(service.convert('user-1', 'USD', 'EUR', 10000)).rejects.toThrow(BadRequestException);
    });
  });

  describe('trade', () => {
    it('validates trade pair and returns idempotent response when key exists', async () => {
      const stored = {
        balances: [{ currencyCode: 'NGN', amount: '0' }, { currencyCode: 'USD', amount: '10.0000' }],
        transactionId: 'old-tx',
      };
      mockWalletRepo.findIdempotency.mockResolvedValue({ response: stored });
      const result = await service.trade('user-1', 'NGN', 'USD', 15000, 'trade-key');
      expect(result).toEqual(stored);
    });
  });

  describe('idempotency', () => {
    it('duplicate idempotencyKey returns stored response without double-apply', async () => {
      const stored = { balances: [{ currencyCode: 'USD', amount: '200.0000' }], transactionId: 'first-tx' };
      mockWalletRepo.findIdempotency
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ response: stored });
      const first = await service.fund('user-1', 'USD', 100, 'key-1');
      expect(first.transactionId).toBeDefined();
      mockWalletRepo.getDataSource.mockClear();
      const second = await service.fund('user-1', 'USD', 100, 'key-1');
      expect(second).toEqual(stored);
    });
  });

  describe('transfer', () => {
    it('same-user transfer debits fromCurrency and credits toCurrency with FX rate', async () => {
      mockWalletRepo.getBalances.mockResolvedValue([
        { currencyCode: 'NGN', amount: '0.0000' },
        { currencyCode: 'USD', amount: '20.0000' },
      ]);
      mockWalletRepo.debitBalance.mockResolvedValue({});
      mockWalletRepo.creditBalance.mockResolvedValue({});
      const result = await service.transfer('user-1', {
        fromCurrency: 'USD',
        toCurrency: 'NGN',
        amount: 10,
      });
      expect(result).toHaveProperty('transactionId');
      expect(result.balances).toBeDefined();
      expect(mockWalletRepo.debitBalance).toHaveBeenCalled();
      expect(mockWalletRepo.creditBalance).toHaveBeenCalledWith('user-1', 'NGN', expect.any(String), expect.anything());
    });
    it('P2P transfer debits sender and credits toUserId', async () => {
      mockWalletRepo.getBalances.mockResolvedValue([{ currencyCode: 'USD', amount: '5.0000' }]);
      mockWalletRepo.debitBalance.mockResolvedValue({});
      mockWalletRepo.creditBalance.mockResolvedValue({});
      const result = await service.transfer('user-1', {
        toUserId: 'user-2',
        fromCurrency: 'USD',
        amount: 5,
      });
      expect(result).toHaveProperty('transactionId');
      expect(mockWalletRepo.debitBalance).toHaveBeenCalledWith('user-1', 'USD', '5.0000', expect.anything());
      expect(mockWalletRepo.creditBalance).toHaveBeenCalledWith('user-2', 'USD', '5.0000', expect.anything());
    });
    it('transfer returns idempotent response when idempotencyKey exists', async () => {
      const stored = {
        balances: [{ currencyCode: 'USD', amount: '10.0000' }],
        transactionId: 'prev-tx',
      };
      mockWalletRepo.findIdempotency.mockResolvedValue({ response: stored });
      const result = await service.transfer('user-1', {
        fromCurrency: 'USD',
        toCurrency: 'NGN',
        amount: 10,
        idempotencyKey: 'key-1',
      });
      expect(result).toEqual(stored);
    });
    it('P2P transfer throws when toUserId not found', async () => {
      mockUserService.findById.mockResolvedValue(null);
      await expect(
        service.transfer('user-1', { toUserId: 'missing-user', fromCurrency: 'USD', amount: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
    it('same-user transfer throws when fromCurrency equals toCurrency', async () => {
      await expect(
        service.transfer('user-1', { fromCurrency: 'USD', toCurrency: 'USD', amount: 10 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
