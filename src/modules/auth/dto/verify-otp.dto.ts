import { IsEmail, IsIn, IsString, Length } from 'class-validator';

const OTP_TYPES = ['email_verification'] as const;

export class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(4, 8, { message: 'OTP must be 4-8 characters' })
  otp: string;

  @IsIn(OTP_TYPES, { message: 'Invalid OTP type' })
  type: string;
}
