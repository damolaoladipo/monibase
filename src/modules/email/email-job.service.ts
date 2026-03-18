import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullQueueService } from '../bull/bull-queue.service';
import { EMAIL_QUEUE_NAME, JobName } from './email-queue.constants';
import { User } from '../user/entities/user.entity';
import { EmailViewService } from './email-view.service';

export interface SendOtpPayload {
  email: string;
  otp: string;
  type: string;
}

export interface SendMailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class EmailJobService {
  constructor(
    private readonly bullQueue: BullQueueService,
    private readonly config: ConfigService,
    private readonly emailView: EmailViewService,
  ) {}

  /**
   * Enqueue send-otp job (troott-api addJob pattern). Uses reusable Bull queue.
   */
  async enqueueSendOtp(payload: SendOtpPayload): Promise<{ jobId: string }> {
    return this.bullQueue.addJob({
      queueName: EMAIL_QUEUE_NAME,
      jobName: JobName.SendOtp,
      data: payload as unknown as Record<string, unknown>,
    });
  }

  /**
   * Enqueue a generic send-mail job (troott-api queueEmailJob pattern).
   */
  async enqueueSendMail(payload: SendMailPayload): Promise<{ jobId: string }> {
    return this.bullQueue.addJob({
      queueName: EMAIL_QUEUE_NAME,
      jobName: JobName.SendMail,
      data: payload as unknown as Record<string, unknown>,
    });
  }

  /** Enqueue welcome email (troott-api sendUserWelcomeEmail). */
  async enqueueWelcome(user: User): Promise<{ jobId: string }> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const subject = `Welcome, ${user.firstName || 'User'}!`;
    const text = `Welcome. You can sign in at ${appUrl}.`;
    const html =
      this.emailView.render('welcome', {
        firstName: user.firstName || '',
        appUrl,
      }) ??
      `<!DOCTYPE html><html><body><p>Welcome${user.firstName ? `, ${user.firstName}` : ''}.</p><p>You can sign in at <a href="${appUrl}">${appUrl}</a>.</p></body></html>`;
    return this.enqueueSendMail({
      to: user.email,
      subject,
      text,
      html,
    });
  }

  /** Enqueue password reset notification (troott-api sendPasswordResetNotificationEmail). */
  async enqueuePasswordResetNotification(user: User): Promise<{ jobId: string }> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const subject = 'Reset your password';
    const text = `Hi ${user.firstName || 'User'}, we received a request to reset your password. If this wasn't you, ignore this email. Reset at ${appUrl}.`;
    const html =
      this.emailView.render('password-reset', {
        firstName: user.firstName || 'User',
        appUrl,
      }) ??
      `<!DOCTYPE html><html><body><p>Hi ${user.firstName || 'User'},</p><p>We received a request to reset your password.</p><p>If this wasn't you, ignore this email.</p><p><a href="${appUrl}">Reset password</a></p></body></html>`;
    return this.enqueueSendMail({
      to: user.email,
      subject,
      text,
      html,
    });
  }

  /** Enqueue password change confirmation (troott-api sendPasswordChangeNotificationEmail). */
  async enqueuePasswordChangeNotification(user: User): Promise<{ jobId: string }> {
    const subject = 'Your password has been changed';
    const text = `Hi ${user.firstName || 'User'}, this confirms your password was changed. If this wasn't you, contact support.`;
    const html =
      this.emailView.render('password-changed', {
        firstName: user.firstName || 'User',
      }) ?? undefined;
    return this.enqueueSendMail({
      to: user.email,
      subject,
      text,
      html,
    });
  }
}
