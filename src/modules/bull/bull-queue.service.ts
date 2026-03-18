import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Bull, { Queue, Job, DoneCallback } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { getRedisConfig } from '../../configs/redis.config';
import {
  CreateQueueDTO,
  CreateWorkerDTO,
  AddJobDTO,
  AddJobsDTO,
  JobDataDTO,
} from './dto/queue.dto';

const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  delay: 3000,
  backoff: { type: 'exponential' as const, delay: 5000 },
};

@Injectable()
export class BullQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(BullQueueService.name);
  private readonly queues = new Map<string, Queue>();

  constructor(private readonly config: ConfigService) {}

  private getRedisOptions() {
    return getRedisConfig(this.config);
  }

  private getDefaultJobOptions(): Bull.JobOptions {
    return {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    };
  }

  /**
   * Create or get queue by name (troott-api createQueue pattern).
   */
  async createQueue(data: CreateQueueDTO): Promise<Queue> {
    const { name } = data;
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }
    const options: Bull.QueueOptions = {
      redis: this.getRedisOptions(),
      defaultJobOptions: this.getDefaultJobOptions(),
    };
    const redis = this.getRedisOptions();
    this.logger.log(`Bull connecting to: ${redis.host}:${redis.port}`);
    const queue = new Bull(name, options);

    queue.on('error', (err) => {
      this.logger.error(`Queue '${queue.name}' error: ${err?.message ?? err}`);
    });

    this.queues.set(name, queue);
    return queue;
  }

  /**
   * Add a single job (troott-api addJob pattern). Logs success for traceability.
   */
  async addJob(payload: AddJobDTO): Promise<{ jobId: string }> {
    const { queueName, jobName, data, options } = payload;
    const jobId = (options?.jobId as string) ?? uuidv4();
    const queue = await this.createQueue({ name: queueName });
    await queue.add(jobName, data, {
      ...DEFAULT_JOB_OPTIONS,
      ...options,
      jobId,
    });
    this.logger.log(`Successfully added job ${jobId} to ${queueName}`);
    return { jobId };
  }

  /**
   * Add multiple jobs (troott-api addJobs pattern).
   */
  async addJobs(payload: AddJobsDTO): Promise<void> {
    const { queueName, jobs } = payload;
    const queue = await this.createQueue({ name: queueName });
    const addedJobIds: (string | number)[] = [];

    for (const job of jobs) {
      const jobId = (job.options?.jobId as string) ?? uuidv4();
      await queue.add(job.name, job.data, {
        ...DEFAULT_JOB_OPTIONS,
        ...job.options,
        jobId,
      });
      addedJobIds.push(jobId);
    }

    if (jobs.length > 0) {
      this.logger.log(
        `BATCH SUMMARY: Submitted ${jobs.length} jobs to queue '${queueName}'. IDs: ${addedJobIds.join(', ')}`,
      );
    }
  }

  /**
   * Attach a processor to a queue (troott-api addProcessor pattern).
   * Registers completed/failed event logging.
   */
  async addProcessor(
    data: CreateWorkerDTO,
    callback: (job: Job<JobDataDTO['data']>, done: DoneCallback) => Promise<void>,
  ): Promise<Queue> {
    const { queueName, jobName, concurrency = 10 } = data;
    const queue = await this.createQueue({ name: queueName });

    queue.process(jobName, concurrency, callback);

    queue.on('completed', (job) => {
      this.logger.log(`Job ${job.id} completed (queue: ${queue.name})`);
    });

    queue.on('failed', (job, err) => {
      this.logger.error(
        `Job ${job?.id} failed for queue ${queue.name}: ${err?.message ?? err}`,
      );
    });

    this.logger.log(`Worker started: ${queueName} (${jobName}), concurrency: ${concurrency}`);
    return queue;
  }

  getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  async closeQueue(name: string): Promise<void> {
    const queue = this.queues.get(name);
    if (!queue) return;
    await queue.close();
    this.queues.delete(name);
    this.logger.log(`Closed queue '${name}'`);
  }

  async onModuleDestroy(): Promise<void> {
    for (const name of this.queues.keys()) {
      await this.closeQueue(name);
    }
  }
}
