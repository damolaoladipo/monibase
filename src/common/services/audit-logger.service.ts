import { Injectable, Logger } from '@nestjs/common';

export interface AuditEntry {
  userId?: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure';
  timestamp?: string;
  requestId?: string;
}

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger('Audit');

  log(entry: AuditEntry): void {
    this.logger.log(
      JSON.stringify({
        ...entry,
        timestamp: entry.timestamp || new Date().toISOString(),
      }),
    );
  }
}
