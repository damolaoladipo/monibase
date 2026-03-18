import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FxDeliveryEstimateDto {
  @ApiProperty({
    description: 'ISO 8601 duration; null means open bound (e.g. "up to max only")',
    example: 'PT0S',
    nullable: true,
  })
  min!: string | null;

  @ApiProperty({
    description: 'ISO 8601 duration; null means open bound (e.g. "from min only")',
    example: 'PT0S',
    nullable: true,
  })
  max!: string | null;
}

export class FxQuoteRouteDto {
  @ApiProperty()
  sourceCurrency!: string;

  @ApiProperty()
  targetCurrency!: string;
}

export class FxQuoteItemDto {
  @ApiProperty({ example: 'monibase' })
  provider!: string;

  @ApiProperty({ type: FxQuoteRouteDto })
  route!: FxQuoteRouteDto;

  @ApiPropertyOptional({ description: 'Send amount when requested' })
  sendAmount?: string;

  @ApiProperty({ description: 'Exchange rate (1 source = rate target)' })
  rate!: string;

  @ApiProperty({ description: 'Fee in source currency (currently 0)' })
  fee!: string;

  @ApiPropertyOptional({ description: 'Amount received in target currency when sendAmount given' })
  receivedAmount?: string;

  @ApiProperty({ type: FxDeliveryEstimateDto })
  delivery!: FxDeliveryEstimateDto;
}

export class FxQuotesResponseDto {
  @ApiProperty({ type: [FxQuoteItemDto] })
  quotes!: FxQuoteItemDto[];
}

export class FxQuoteDebugResponseDto extends FxQuotesResponseDto {
  @ApiProperty({ description: 'Whether served from stale cache fallback' })
  stale!: boolean;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ description: 'FX API base currency used for the rate row' })
  rateBase!: string;

  @ApiProperty({ description: 'Mid-market style rate (same as quoted rate; no markup layer yet)' })
  midMarketRate!: string;

  @ApiProperty({ description: 'Markup on mid-market as percent (0 when no spread configured)' })
  markupPercent!: number;

  @ApiProperty({ example: 'external_fx_api' })
  source!: string;
}
