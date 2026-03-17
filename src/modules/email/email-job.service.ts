import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const SEND_OTP_JOB = 'send-otp';

export interface SendOtpPayload {
  email: string;
  otp: string;
  type: string;
}

@Injectable()
export class EmailJobService {
  constructor(
    @InjectQueue('email')
    private readonly queue: Queue,
  ) {}

  async enqueueSendOtp(payload: SendOtpPayload): Promise<void> {
    await this.queue.add(SEND_OTP_JOB, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }
}
