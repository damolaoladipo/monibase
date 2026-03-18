import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
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
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const appConfig = getAppConfig(config);

  // Body parser (api app.config: 50mb)
  app.use(express.json({ limit: BODY_PARSER_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: BODY_PARSER_LIMIT }));

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
    .setDescription('Backend API for FX Trading App: auth, wallet, FX rates, transactions, KYC')
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

  const shutdown = (signal: string): void => {
    console.log(`${signal} received, closing application...`);
    app.close().then(() => {
      process.exit(signal === 'unhandledRejection' ? 1 : 0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (err: unknown) => {
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
