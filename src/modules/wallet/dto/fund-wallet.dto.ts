import { IsIn, IsNumber, IsOptional, IsString, IsPositive, Min } from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../../../common/constants/currencies';

export class FundWalletDto {
  @IsIn([...SUPPORTED_CURRENCIES], { message: 'Currency must be one of: NGN, USD, EUR, GBP' })
  currency: string;

  @IsNumber()
  @IsPositive()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
