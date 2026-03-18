/**
 * E2E: wallet fund, idempotency (duplicate key returns stored response).
 * Requires test DB and a verified user. Skips convert/trade if KYC blocks.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { User } from '../../src/modules/user/entities/user.entity';
import { expectSuccessResponse, generateTestData } from '../utils/test-helpers';
import { ValidationPipe } from '@nestjs/common';

async function registerAndLogin(
  app: INestApplication,
  userRepo: Repository<User>,
): Promise<{ token: string; userId: string }> {
  const { email, password } = generateTestData();
  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password, firstName: 'Wallet', lastName: 'E2E' });
  const user = await userRepo.findOne({
    where: { email: email.toLowerCase() },
    select: { id: true, otp: true },
  });
  if (!user?.otp) throw new Error('No OTP after register');
  await request(app.getHttpServer())
    .post('/api/v1/auth/verify')
    .send({ email, otp: user.otp, type: 'email_verification' });
  const loginRes = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password });
  const token = loginRes.body.data?.token ?? loginRes.body.token;
  if (!token) throw new Error('No token after login');
  return { token, userId: user.id };
}

describe('Wallet (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    userRepo = moduleFixture.get(getRepositoryToken(User));
    const auth = await registerAndLogin(app, userRepo);
    token = auth.token;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /wallet returns balances', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/wallet')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data ?? res.body)).toBe(true);
  });

  it('POST /wallet/fund creates balance and returns transactionId', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/wallet/fund')
      .set('Authorization', `Bearer ${token}`)
      .send({ currency: 'USD', amount: 100 });
    expect(res.status).toBe(201);
    const data = res.body.data ?? res.body;
    expect(data.transactionId).toBeDefined();
    expect(data.balances).toBeDefined();
  });

  it('duplicate idempotencyKey returns stored response without double-apply', async () => {
    const idemKey = `e2e-idem-${Date.now()}`;
    const first = await request(app.getHttpServer())
      .post('/api/v1/wallet/fund')
      .set('Authorization', `Bearer ${token}`)
      .send({ currency: 'USD', amount: 50, idempotencyKey: idemKey });
    expect(first.status).toBe(201);
    const firstData = first.body.data ?? first.body;
    const firstTxId = firstData.transactionId;

    const second = await request(app.getHttpServer())
      .post('/api/v1/wallet/fund')
      .set('Authorization', `Bearer ${token}`)
      .send({ currency: 'USD', amount: 50, idempotencyKey: idemKey });
    expect(second.status).toBe(201);
    const secondData = second.body.data ?? second.body;
    expect(secondData.transactionId).toBe(firstTxId);
  });
});
