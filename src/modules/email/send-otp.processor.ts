import { Injectable, Logger } from '@nestjs/common';
import { Job, DoneCallback } from 'bull';
import { JobName } from './email-queue.constants';
import { SendOtpPayload } from './email-job.service';
import { EmailService } from './email.service';
import { EmailViewService } from './email-view.service';

const LOG_LABEL = 'email-processor';

/**
 * Processor for send-otp jobs (troott-api emailProcessor pattern).
 * Uses IResult from EmailService; on result.error calls done(error) so Bull retries.
 */
@Injectable()
export class SendOtpProcessor {
  private readonly logger = new Logger(LOG_LABEL);

  constructor(
    private readonly emailService: EmailService,
    private readonly emailView: EmailViewService,
  ) {}

  async process(job: Job<SendOtpPayload>, done: DoneCallback): Promise<void> {
    if (job.name !== JobName.SendOtp) {
      return done();
    }

    const { email, otp, type } = job.data;

    this.logger.log(
      `Processing Email Job ID: ${job.id}, Recipient: ${email}, Type: ${type}`,
    );

    if (!email || !otp) {
      this.logger.warn(`Invalid send-otp payload: missing email or otp (Job ID: ${job.id})`);
      return done();
    }

    try {
      const subject = type === 'email_verification' ? 'Verify your email' : 'Your OTP';
      const text = `Your OTP is: ${otp}. Do not share it.`;
      const html =
        this.emailView.render('verify-otp', {
          code: otp,
          expiry: '15 minutes',
        }) ?? undefined;
      const result = await this.emailService.send(email, subject, text, html);

      if (result.error) {
        this.logger.error(
          `Failed to process Email Job ID: ${job.id}. Error: ${result.message}`,
        );
        return done(new Error(result.message));
      }

      this.logger.log(
        `Successfully processed Email Job ID: ${job.id} for ${email}`,
      );
      done(null, { sent: true, to: email });
    } catch (err) {
      this.logger.error(
        `Critical error during processing of Job ID: ${job.id}. Error: ${err instanceof Error ? err.message : err}`,
        (err as Error)?.stack,
      );
      done(err as Error);
    }
  }
}
