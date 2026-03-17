import { Injectable, Logger } from '@nestjs/common';
import { Job, DoneCallback } from 'bull';
import { JobName } from './email-queue.constants';
import { SendMailPayload } from './email-job.service';
import { EmailService } from './email.service';

/**
 * Processor for generic send-mail jobs (troott-api dispatch pattern).
 */
@Injectable()
export class SendMailProcessor {
  private readonly logger = new Logger('send-mail-processor');

  constructor(private readonly emailService: EmailService) {}

  async process(job: Job<SendMailPayload>, done: DoneCallback): Promise<void> {
    if (job.name !== JobName.SendMail) {
      return done();
    }
    const { to, subject, text, html } = job.data;
    if (!to || !subject || !text) {
      this.logger.warn(`Invalid send-mail payload (Job ID: ${job.id})`);
      return done();
    }
    try {
      const result = await this.emailService.send(to, subject, text, html);
      if (result.error) {
        this.logger.error(`Send mail failed Job ID: ${job.id}. ${result.message}`);
        return done(new Error(result.message));
      }
      this.logger.log(`Send mail completed Job ID: ${job.id} to ${to}`);
      done(null, { sent: true, to });
    } catch (err) {
      this.logger.error(`Send mail error Job ID: ${job.id}. ${err instanceof Error ? err.message : err}`);
      done(err as Error);
    }
  }
}
