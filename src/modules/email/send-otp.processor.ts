import { Injectable, Logger } from '@nestjs/common';
import { Job, DoneCallback } from 'bull';
import { JobName } from './email-queue.constants';
import { SendOtpPayload } from './email-job.service';
import { EmailService } from './email.service';

const LOG_LABEL = 'email-processor';

/**
 * Processor for send-otp jobs (troott-api emailProcessor pattern).
 * Uses IResult from EmailService; on result.error calls done(error) so Bull retries.
 */
@Injectable()
export class SendOtpProcessor {
  private readonly logger = new Logger(LOG_LABEL);

  constructor(private readonly emailService: EmailService) {}

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
      const result = await this.emailService.send(
        email,
        type === 'email_verification' ? 'Verify your email' : 'Your OTP',
        `Your OTP is: ${otp}. Do not share it.`,
      );

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
