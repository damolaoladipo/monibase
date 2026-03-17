import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from './modules/bull/bull.module';
import { APP_GUARD } from '@nestjs/core';
import { envValidationSchema } from './config/env.validation';
import { getDbConfig, getTypeOrmOptionsFromDbConfig } from './config/db.config';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmailModule } from './modules/email/email.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { FxModule } from './modules/fx/fx.module';
import { KycModule } from './modules/kyc/kyc.module';
import { StorageModule } from './modules/storage/storage.module';
import { TasksModule } from './tasks/tasks.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { DeviceDetectionMiddleware } from './common/middleware/device-detection.middleware';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const db = getDbConfig(config);
        return {
          ...getTypeOrmOptionsFromDbConfig(db),
          autoLoadEntities: true,
          synchronize: config.get<string>('NODE_ENV') === 'development',
        };
      },
      inject: [ConfigService],
    }),
    CommonModule,
    BullModule,
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 30,
      },
    ]),
    EmailModule,
    TasksModule,
    AuthModule,
    WalletModule,
    FxModule,
    KycModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(DeviceDetectionMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
