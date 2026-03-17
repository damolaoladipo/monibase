import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SEND_OTP_JOB, SendOtpPayload } from './email-job.service';
import { EmailService } from './email.service';

@Processor('email')
export class SendOtpProcessor extends WorkerHost {
  private readonly logger = new Logger(SendOtpProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<SendOtpPayload, unknown, string>): Promise<unknown> {
    if (job.name !== SEND_OTP_JOB) {
      return;
    }
    const { email, otp, type } = job.data;
    if (!email || !otp) {
      this.logger.warn(`Invalid send-otp payload: missing email or otp`);
      return;
    }
    try {
      const subject = type === 'email_verification' ? 'Verify your email' : 'Your OTP';
      const text = `Your OTP is: ${otp}. Do not share it.`;
      await this.emailService.send(email, subject, text);
      this.logger.log(`OTP email sent to ${email}`);
      return { sent: true };
    } catch (err) {
      this.logger.error(`Failed to send OTP email to ${email}: ${err}`);
      throw err;
    }
  }
}
