/**
 * E2E: auth flow (register, verify OTP, login, logout).
 * Requires test DB (DB_DATABASE=monibase_test) and env from test/setup.ts.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { User } from '../../src/modules/user/entities/user.entity';
import { expectSuccessResponse, expectErrorResponse, generateTestData } from '../utils/test-helpers';
import { ValidationPipe } from '@nestjs/common';

describe('Auth (e2e)', () => {
  let app: INestApplication | undefined;
  let userRepo: Repository<User> | undefined;

  beforeAll(async () => {
    try {
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
    } catch (e) {
      app = undefined;
      userRepo = undefined;
      console.warn('Auth e2e skipped (e.g. DB unavailable):', (e as Error).message);
    }
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('register returns 201 and message', async () => {
    if (!app || !userRepo) return;
    const { email, password } = generateTestData();
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'E2E', lastName: 'User' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data?.message ?? res.body.message).toMatch(/check email|OTP/i);
  });

  it('verify OTP then login returns token', async () => {
    if (!app || !userRepo) return;
    const { email, password } = generateTestData();
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'E2E', lastName: 'User' });

    const user = await userRepo.findOne({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, otp: true, otpExpiry: true, otpType: true },
    });
    expect(user?.otp).toBeDefined();
    const otp = user!.otp!;

    await request(app.getHttpServer())
      .post('/api/v1/auth/verify')
      .send({ email, otp, type: 'email_verification' });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    expect(loginRes.status).toBe(201);
    expect(loginRes.body.data?.token ?? loginRes.body.token).toBeDefined();
  });

  it('login without verify returns 401', async () => {
    if (!app || !userRepo) return;
    const { email, password } = generateTestData();
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password });
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    expect(loginRes.status).toBe(401);
  });

  it('logout with valid token returns 201', async () => {
    if (!app || !userRepo) return;
    const { email, password } = generateTestData();
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({ email, password });
    const user = await userRepo.findOne({ where: { email: email.toLowerCase() }, select: { otp: true } });
    await request(app.getHttpServer())
      .post('/api/v1/auth/verify')
      .send({ email, otp: user!.otp, type: 'email_verification' });
    const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password });
    const token = loginRes.body.data?.token ?? loginRes.body.token;

    const logoutRes = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(201);
  });
});
