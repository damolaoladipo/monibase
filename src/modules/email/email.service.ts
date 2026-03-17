import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

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

  async send(to: string, subject: string, text: string, html?: string): Promise<void> {
    const from = this.config.get<string>('MAIL_FROM');
    await this.getTransporter().sendMail({
      from,
      to,
      subject,
      text,
      html: html ?? text,
    });
  }
}
