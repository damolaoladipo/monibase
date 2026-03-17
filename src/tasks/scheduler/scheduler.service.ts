import { Injectable, Logger } from '@nestjs/common';

/**
 * Placeholder for scheduled/cron tasks (troott-api tasks/scheduler pattern).
 * Add @Cron handlers when @nestjs/schedule is installed, or use Bull repeatable jobs.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  /**
   * Placeholder: tmp cleanup (e.g. temp files, expired records).
   */
  async runTmpCleanup(): Promise<void> {
    this.logger.debug('Tmp cleanup placeholder');
  }

  /**
   * Placeholder: reminder jobs (e.g. notifications).
   */
  async runReminder(): Promise<void> {
    this.logger.debug('Reminder placeholder');
  }
}
