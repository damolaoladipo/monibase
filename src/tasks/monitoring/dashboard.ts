import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import type { Queue } from 'bull';

export const DASHBOARD_BASE_PATH = '/jobs/ui';

/**
 * Create Bull Board router for queue monitoring. Mount at DASHBOARD_BASE_PATH.
 * Protect with admin-only (e.g. express-basic-auth) before mounting.
 */
export function createDashboardRouter(queues: Queue[]): ReturnType<ExpressAdapter['getRouter']> {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(DASHBOARD_BASE_PATH);
  const adapters = queues.map((q) => new BullAdapter(q));
  createBullBoard({ queues: adapters, serverAdapter });
  return serverAdapter.getRouter();
}
