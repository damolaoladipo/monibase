import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class ReviewKycDto {
  @IsUUID()
  kycId: string;

  @IsIn(['verified', 'rejected'])
  status: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
