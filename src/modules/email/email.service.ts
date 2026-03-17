import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { IResult } from '../../common/types/result.interface';
import { OtpType } from '../user/entities/user.entity';

const MAX_SEND_RETRIES = 3;

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  /**
   * Subject line for OTP type (troott-api switchOtpSubject).
   */
  getOtpSubject(otpType: string): string {
    switch (otpType) {
      case OtpType.EMAIL_VERIFICATION:
        return 'Verify your account';
      case 'password_reset':
        return 'Reset your password';
      case 'password_change':
        return 'Change password code';
      default:
        return 'Verify your account';
    }
  }

  /**
   * Body content for OTP email (troott-api switchOtpContent).
   */
  getOtpContent(otpType: string, firstName: string): { subject: string; bodyOne: string; bodyTwo: string } {
    const name = firstName || 'User';
    const subject = this.getOtpSubject(otpType);
    switch (otpType) {
      case OtpType.EMAIL_VERIFICATION:
        return {
          subject,
          bodyOne: `Welcome. Please verify your account.`,
          bodyTwo: `Use the OTP in this email to activate your profile. It expires in 15 minutes.`,
        };
      case 'password_reset':
        return {
          subject,
          bodyOne: `Hi ${name}, you requested to reset your password.`,
          bodyTwo: `Use the OTP below to proceed. If you didn't request this, ignore this email.`,
        };
      default:
        return {
          subject,
          bodyOne: `Hi ${name}, use the OTP below to verify.`,
          bodyTwo: `Valid for 15 minutes.`,
        };
    }
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('MAIL_HOST'),
        port: this.config.get<number>('MAIL_PORT', 587),
        secure: false,
        auth:
          this.config.get<string>('MAIL_USER') && this.config.get<string>('MAIL_PASSWORD')
            ? {
                user: this.config.get<string>('MAIL_USER'),
                pass: this.config.get<string>('MAIL_PASSWORD'),
              }
            : undefined,
      });
    }
    return this.transporter;
  }

  /**
   * Send email with retries (troott-api sendWithRetry pattern).
   * Returns Result so the processor can signal retry on error without throwing.
   */
  async send(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<IResult<{ to: string; error?: string }>> {
    const result: IResult<{ to: string; error?: string }> = {
      error: false,
      message: '',
      code: 200,
      data: { to },
    };

    for (let attempt = 1; attempt <= MAX_SEND_RETRIES; attempt++) {
      try {
        const from = this.config.get<string>('MAIL_FROM');
        await this.getTransporter().sendMail({
          from,
          to,
          subject,
          text,
          html: html ?? text,
        });
        result.message = `Email sent to ${to}`;
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (attempt === MAX_SEND_RETRIES) {
          result.error = true;
          result.message = 'Failed to send email.';
          result.code = 500;
          result.data = { to, error: message };
          return result;
        }
      }
    }

    return result;
  }
}
