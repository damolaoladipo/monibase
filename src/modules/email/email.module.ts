import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailService } from './email.service';
import { EmailJobService } from './email-job.service';
import { SendOtpProcessor } from './send-otp.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'email' })],
  providers: [EmailService, EmailJobService, SendOtpProcessor],
  exports: [EmailJobService],
})
export class EmailModule {}
