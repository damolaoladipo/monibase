/**
 * Email job constants and payload types (troott-api tasks/jobs/email.job pattern).
 * Processors: SendOtpProcessor, SendMailProcessor (email module).
 */
import { EMAIL_QUEUE_NAME, JobName } from '../../modules/email/email-queue.constants';

export const EmailJobQueueName = EMAIL_QUEUE_NAME;
export const EmailJobName = JobName.SendOtp;

export interface SendOtpJobPayload {
  email: string;
  otp: string;
  type: string;
}

export interface SendMailJobPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export { EMAIL_QUEUE_NAME, JobName };
