/**
 * Mock EmailService / EmailJobService for unit tests (no real email).
 */
export const mockEnqueueSendOtp = jest.fn().mockResolvedValue({ jobId: 'mock-otp-job' });
export const mockEnqueueSendMail = jest.fn().mockResolvedValue({ jobId: 'mock-mail-job' });
export const mockEnqueueWelcome = jest.fn().mockResolvedValue({ jobId: 'mock-welcome-job' });

export const createEmailJobServiceMock = () => ({
  enqueueSendOtp: mockEnqueueSendOtp,
  enqueueSendMail: mockEnqueueSendMail,
  enqueueWelcome: mockEnqueueWelcome,
  enqueuePasswordResetNotification: jest.fn().mockResolvedValue({ jobId: 'mock-reset-job' }),
  enqueuePasswordChangeNotification: jest.fn().mockResolvedValue({ jobId: 'mock-change-job' }),
});
