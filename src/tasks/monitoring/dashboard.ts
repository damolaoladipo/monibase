/**
 * Placeholder for queue monitoring UI (troott-api tasks/monitoring/dashboard pattern).
 * Optional: use @bull-board/api + @bull-board/express to expose a /jobs/ui dashboard
 * with Redis connection from config.
 *
 * Example:
 *   const serverAdapter = new ExpressAdapter();
 *   serverAdapter.setBasePath('/jobs/ui');
 *   createBullBoard({ queues: [...], serverAdapter });
 */

export const DASHBOARD_BASE_PATH = '/jobs/ui';
