import { Injectable, Logger } from '@nestjs/common';
import { BullQueueService } from '../../modules/bull/bull-queue.service';
import { AddJobDTO, AddJobsDTO } from '../../modules/bull/dto/queue.dto';

/**
 * Central service for enqueueing background jobs (troott-api tasks/jobs/job pattern).
 * Use this or feature-specific *JobService (e.g. EmailJobService) to add jobs.
 */
@Injectable()
export class TaskJobService {
  private readonly logger = new Logger(TaskJobService.name);

  constructor(private readonly bullQueue: BullQueueService) {}

  addJob(payload: AddJobDTO): Promise<{ jobId: string }> {
    return this.bullQueue.addJob(payload).then((result) => {
      this.logger.log(
        `Successfully added job ${result.jobId} to ${payload.queueName}`,
      );
      return result;
    });
  }

  async addJobs(payload: AddJobsDTO): Promise<void> {
    await this.bullQueue.addJobs(payload);
    if (payload.jobs.length > 0) {
      this.logger.log(
        `BATCH: Submitted ${payload.jobs.length} jobs to queue '${payload.queueName}'`,
      );
    }
  }
}
