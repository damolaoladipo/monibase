import { IsIn, IsNumber, IsOptional, IsString, IsPositive, Min } from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../../../common/constants/currencies';

const NGN = 'NGN';

export class TradeDto {
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

export function validateTradePair(source: string, target: string): void {
  const oneIsNgn = source === NGN || target === NGN;
  if (!oneIsNgn) {
    throw new Error('Trade must involve NGN (Naira)');
  }
  if (source === target) {
    throw new Error('Source and target currency must differ');
  }
}
