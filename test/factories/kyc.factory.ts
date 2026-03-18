/**
 * Build KYC-like data for tests (no save). Use with KycEntity if needed.
 */
export function buildKycData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    userId: '00000000-0000-0000-0000-000000000000',
    status: 'pending',
    ...overrides,
  };
}
