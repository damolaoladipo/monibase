import { Module } from '@nestjs/common';
import { FxController } from './fx.controller';
import { FxAdminController } from './fx-admin.controller';
import { FxRatesService } from './fx-rates.service';
import { FxQuoteService } from './fx-quote.service';

@Module({
  controllers: [FxController, FxAdminController],
  providers: [FxRatesService, FxQuoteService],
  exports: [FxRatesService, FxQuoteService],
})
export class FxModule {}
