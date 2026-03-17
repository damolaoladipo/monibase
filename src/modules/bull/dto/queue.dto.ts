import { JobOptions } from 'bull';

/**
 * DTO for creating a queue (troott-api CreateQueueDTO pattern).
 */
export interface CreateQueueDTO {
  name: string;
}

/**
 * DTO for creating a worker/processor (troott-api CreateWorkerDTO pattern).
 */
export interface CreateWorkerDTO {
  queueName: string;
  jobName: string;
  concurrency?: number;
}

/**
 * Single job add (troott-api AddJobDTO pattern).
 */
export interface AddJobDTO {
  queueName: string;
  jobName: string;
  data: Record<string, unknown>;
  options?: JobOptions;
}

/**
 * Bulk jobs add (troott-api AddJobsDTO pattern).
 */
export interface AddJobsDTO {
  queueName: string;
  jobs: JobDataDTO[];
}

export interface JobDataDTO {
  name: string;
  data: Record<string, unknown>;
  options?: JobOptions;
}
