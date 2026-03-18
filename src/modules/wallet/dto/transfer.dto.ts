import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, IsUUID } from 'class-validator';

export class TransferDto {
  @ApiPropertyOptional({ description: 'Recipient user ID for P2P transfer; omit for same-user transfer' })
  @IsOptional()
  @IsUUID()
  toUserId?: string;

  @ApiPropertyOptional()
  @IsString()
  fromCurrency: string;

  @ApiPropertyOptional({ description: 'Required for same-user transfer (currency to credit); for P2P must equal fromCurrency' })
  @IsOptional()
  @IsString()
  toCurrency?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0.0001)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
