/**
 * Test helpers: response assertions and test data generation.
 */

export function generateTestData(): { email: string; password: string } {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return {
    email: `test-${id}@test.local`,
    password: 'Test@1234',
  };
}

/** Assert response has standard envelope (error, message, data, status). */
export function expectStandardResponse(response: { body: Record<string, unknown> }): void {
  expect(response.body).toHaveProperty('error');
  expect(response.body).toHaveProperty('message');
  expect(response.body).toHaveProperty('data');
  expect(response.body).toHaveProperty('status');
}

/** Assert success (error false, status 2xx). */
export function expectSuccessResponse(response: { status: number; body: Record<string, unknown> }): void {
  expectStandardResponse(response);
  expect(response.body.error).toBe(false);
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
}

/** Assert error response (error true, optional status code). */
export function expectErrorResponse(
  response: { status: number; body: Record<string, unknown> },
  statusCode?: number,
): void {
  expectStandardResponse(response);
  expect(response.body.error).toBe(true);
  if (statusCode !== undefined) {
    expect(response.status).toBe(statusCode);
  }
}
