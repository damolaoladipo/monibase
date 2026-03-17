import { IsIn, IsNumber, IsOptional, IsString, IsPositive, Min } from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../../../common/constants/currencies';

export class ConvertDto {
  @IsIn([...SUPPORTED_CURRENCIES], { message: 'Source currency must be one of: NGN, USD, EUR, GBP' })
  sourceCurrency: string;

  @IsIn([...SUPPORTED_CURRENCIES], { message: 'Target currency must be one of: NGN, USD, EUR, GBP' })
  targetCurrency: string;

  @IsNumber()
  @IsPositive()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
