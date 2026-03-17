/**
 * Queue and job name constants (single source of truth, avoid typos).
 * Aligns with troott-api channel enums pattern.
 */
export const EMAIL_QUEUE_NAME = 'email';

export const JobName = {
  SendOtp: 'emails:send-otp',
  SendMail: 'emails:send',
} as const;

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  delay: 3000,
  backoff: {
    type: 'exponential' as const,
    delay: 5000,
  },
};
