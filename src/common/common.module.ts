import { Global, Module } from '@nestjs/common';
import { AuditLoggerService } from './services/audit-logger.service';

@Global()
@Module({
  providers: [AuditLoggerService],
  exports: [AuditLoggerService],
})
export class CommonModule {}
