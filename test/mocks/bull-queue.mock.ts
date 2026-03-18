/**
 * Mock BullQueueService for unit tests (no Redis).
 */
export const mockAddJob = jest.fn().mockResolvedValue({ jobId: 'mock-job-id' });

export const createBullQueueServiceMock = () => ({
  addJob: mockAddJob,
  getQueue: jest.fn().mockReturnValue({
    add: jest.fn().mockResolvedValue({ id: 'mock-id' }),
    close: jest.fn().mockResolvedValue(undefined),
  }),
});
