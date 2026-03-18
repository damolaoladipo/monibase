import { ApiPropertyOptional } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiPropertyOptional()
  id: string;
  @ApiPropertyOptional()
  email: string;
  @ApiPropertyOptional()
  firstName: string;
  @ApiPropertyOptional()
  lastName: string;
  @ApiPropertyOptional()
  phoneNumber: string | null;
  @ApiPropertyOptional()
  phoneCode: string | null;
  @ApiPropertyOptional()
  role: string;
  @ApiPropertyOptional()
  isActivated: boolean;
  @ApiPropertyOptional()
  isActive: boolean;
  @ApiPropertyOptional()
  createdAt: Date;
}
