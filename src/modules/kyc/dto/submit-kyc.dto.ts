import { IsOptional, IsString, IsDateString, MaxLength } from 'class-validator';

export class SubmitKycDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  idType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  idNumber?: string;
}
