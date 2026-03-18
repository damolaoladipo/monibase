import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../../../common/constants/currencies';

const currencyCodes = [...SUPPORTED_CURRENCIES] as string[];

export class FxQuotesQueryDto {
  @ApiProperty({ example: 'NGN', enum: currencyCodes })
  @IsString()
  @IsIn(currencyCodes)
  sourceCurrency!: string;

  @ApiProperty({ example: 'USD', enum: currencyCodes })
  @IsString()
  @IsIn(currencyCodes)
  targetCurrency!: string;

  @ApiPropertyOptional({
    description: 'Send amount for receivedAmount calculation',
    example: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  amount?: number;
}
