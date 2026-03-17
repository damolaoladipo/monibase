import { Module } from '@nestjs/common';
import { BullModule } from '../modules/bull/bull.module';
import { EmailModule } from '../modules/email/email.module';
import { TaskJobService } from './jobs/task-job.service';
import { TasksWorkerService } from './workers/worker.service';
import { SchedulerService } from './scheduler/scheduler.service';

/**
 * Tasks module (troott-api src/tasks pattern).
 * - jobs: TaskJobService for enqueueing jobs (addJob, addJobs)
 * - workers: TasksWorkerService registers all Bull processors on init
 * - scheduler: placeholder for cron/scheduled tasks
 * - monitoring: placeholder for queue dashboard
 */
@Module({
  imports: [BullModule, EmailModule],
  providers: [TaskJobService, TasksWorkerService, SchedulerService],
  exports: [TaskJobService],
})
export class TasksModule {}
