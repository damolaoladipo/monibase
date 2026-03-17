import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bull';
import { BullQueueService } from '../../modules/bull/bull-queue.service';
import { SendOtpProcessor } from '../../modules/email/send-otp.processor';
import { SendMailProcessor } from '../../modules/email/send-mail.processor';
import { SendOtpPayload, SendMailPayload } from '../../modules/email/email-job.service';
import { EMAIL_QUEUE_NAME, JobName } from '../../modules/email/email-queue.constants';

/**
 * Registers all Bull workers (processors) on module init (troott-api tasks/workers/worker pattern).
 * Add new processors here when you add new job types.
 */
@Injectable()
export class TasksWorkerService implements OnModuleInit {
  private readonly logger = new Logger(TasksWorkerService.name);

  constructor(
    private readonly bullQueue: BullQueueService,
    private readonly sendOtpProcessor: SendOtpProcessor,
    private readonly sendMailProcessor: SendMailProcessor,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.registerSendOtpWorker();
    await this.registerSendMailWorker();
  }

  private async registerSendOtpWorker(): Promise<void> {
    await this.bullQueue.addProcessor(
      {
        queueName: EMAIL_QUEUE_NAME,
        jobName: JobName.SendOtp,
        concurrency: 20,
      },
      (job, done) =>
        this.sendOtpProcessor.process(
          job as unknown as Job<SendOtpPayload>,
          done,
        ),
    );
    this.logger.log(
      `Email worker (send-otp) started: ${EMAIL_QUEUE_NAME} (${JobName.SendOtp}), concurrency: 20`,
    );
  }

  private async registerSendMailWorker(): Promise<void> {
    await this.bullQueue.addProcessor(
      {
        queueName: EMAIL_QUEUE_NAME,
        jobName: JobName.SendMail,
        concurrency: 10,
      },
      (job, done) =>
        this.sendMailProcessor.process(
          job as unknown as Job<SendMailPayload>,
          done,
        ),
    );
    this.logger.log(
      `Email worker (send-mail) started: ${EMAIL_QUEUE_NAME} (${JobName.SendMail}), concurrency: 10`,
    );
  }
}
