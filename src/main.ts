import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import hpp = require('hpp');
import rateLimit from 'express-rate-limit';
import basicAuth from 'express-basic-auth';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import {
  BODY_PARSER_LIMIT,
  getRateLimitOptions,
  getAuthRateLimitOptions,
  getHighValueRateLimitOptions,
  getCorsOptions,
  getAppConfig,
} from './configs/app.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { BullQueueService } from './modules/bull/bull-queue.service';
import { EMAIL_QUEUE_NAME } from './modules/email/email-queue.constants';
import { createDashboardRouter, DASHBOARD_BASE_PATH } from './tasks/monitoring/dashboard';

/**
 * Bootstrap order (api server.ts pattern):
 * Nest resolves: ConfigModule -> TypeORM (DB) -> CacheModule (Redis) -> BullModule -> TasksModule (workers) -> ... then listen.
 * Seed runs in DatabaseSeederService.onModuleInit. Shutdown: SIGTERM/SIGINT/unhandledRejection -> app.close().
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  // Do not use enableShutdownHooks() together with manual SIGTERM/SIGINT handlers:
  // both call app.close() and TypeORM would end the pg pool twice.

  const config = app.get(ConfigService);
  const appConfig = getAppConfig(config);

  // Body parser (api app.config: 50mb)
  app.use(json({ limit: BODY_PARSER_LIMIT }));
  app.use(urlencoded({ extended: true, limit: BODY_PARSER_LIMIT }));

  app.setGlobalPrefix('api/v1');

  // Path-specific rate limits (stricter, run first for these paths)
  const expressInstance = app.getHttpAdapter().getInstance();
  expressInstance.use('/api/v1/auth', rateLimit(getAuthRateLimitOptions()));
  expressInstance.use('/api/v1/wallet/fund', rateLimit(getHighValueRateLimitOptions()));
  expressInstance.use('/api/v1/wallet/trade', rateLimit(getHighValueRateLimitOptions()));
  expressInstance.use('/api/v1/wallet/convert', rateLimit(getHighValueRateLimitOptions()));
  expressInstance.use('/api/v1/wallet/transfer', rateLimit(getHighValueRateLimitOptions()));

  // Global rate limit (api ratelimit.mdw)
  app.use(rateLimit(getRateLimitOptions()));

  // Bull Board (optional, when BULL_BOARD_PASSWORD set)
  const bullBoardPassword = config.get<string>('BULL_BOARD_PASSWORD');
  if (bullBoardPassword) {
    try {
      const bullQueue = app.get(BullQueueService);
      const emailQueue = await bullQueue.createQueue({ name: EMAIL_QUEUE_NAME });
      const boardRouter = createDashboardRouter([emailQueue]);
      const expressInstance = app.getHttpAdapter().getInstance();
      const bullBoardUser = config.get<string>('BULL_BOARD_USER') ?? 'admin';
      expressInstance.use(
        DASHBOARD_BASE_PATH,
        basicAuth({
          challenge: true,
          users: { [bullBoardUser]: bullBoardPassword },
        }),
        boardRouter,
      );
    } catch (err) {
      console.warn('Bull Board not mounted:', (err as Error)?.message);
    }
  }

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Monibase FX Trading API')
    .setDescription(
      [
        'APIs for FX trading: registration, wallet funding, currency conversion, and trading NGN vs USD/EUR/GBP.',
        '',
        '**Get started:** All routes use prefix `/api/v1`. Register, verify OTP, then login to obtain a JWT.',
        '',
        '**Authentication:** Use the Authorize button to set a Bearer JWT for protected endpoints. Required header: `Authorization: Bearer <token>`.',
        '',
        '**Responses:** Success and error bodies use a consistent envelope: `error`, `message`, `errors`, `data`, `status`.',
        '',
        '**Rate limits:** Auth: 20/15min per IP; high-value wallet (fund/trade/convert/transfer): 30/hour per IP; global: 1000/30min per IP. 429 when exceeded.',
        '',
        '**FX:** Public `GET /fx/rates` and `GET /fx/quotes` (Wise-style comparison quotes). Admin: `GET /admin/fx/quote-debug`.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  // Security and CORS (api app.config: helmet, hpp, cors)
  app.use(helmet());
  app.use(hpp());
  app.enableCors(getCorsOptions(config));

  // Pipes, filters, interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new RequestIdInterceptor(),
    new ResponseTransformInterceptor(),
    new LoggingInterceptor(),
  );

  const port = appConfig.port;
  await app.listen(port);

  let isClosing = false;
  const shutdown = (signal: string): void => {
    if (isClosing) return;
    isClosing = true;
    console.log(`${signal} received, closing application...`);
    void app
      .close()
      .then(() => {
        process.exit(signal === 'unhandledRejection' ? 1 : 0);
      })
      .catch((closeErr: unknown) => {
        console.error('Error during app.close():', closeErr);
        process.exit(1);
      });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (err: unknown) => {
    if (isClosing) return;
    console.error('Unhandled rejection:', err);
    shutdown('unhandledRejection');
  });

  console.log(
    `${appConfig.appName} running in ${appConfig.nodeEnv} mode on http://localhost:${port}`,
  );
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
