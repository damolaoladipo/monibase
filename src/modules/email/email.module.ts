import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailJobService } from './email-job.service';
import { SendOtpProcessor } from './send-otp.processor';
import { SendMailProcessor } from './send-mail.processor';

@Module({
  providers: [EmailService, EmailJobService, SendOtpProcessor, SendMailProcessor],
  exports: [EmailJobService, EmailService, SendOtpProcessor, SendMailProcessor],
})
export class EmailModule {}
