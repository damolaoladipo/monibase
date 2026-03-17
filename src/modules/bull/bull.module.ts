import { Global, Module } from '@nestjs/common';
import { BullQueueService } from './bull-queue.service';

/**
 * Reusable Bull queue module (troott-api queue pattern).
 * Use forRoot() in AppModule; then inject BullQueueService to add jobs or register processors.
 * Does not use BullMQ; uses Bull (bull package) only.
 */
@Global()
@Module({
  providers: [BullQueueService],
  exports: [BullQueueService],
})
export class BullModule {}
