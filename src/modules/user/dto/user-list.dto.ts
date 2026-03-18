import { ApiPropertyOptional } from '@nestjs/swagger';

export class UserListDto {
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
  isDeactivated: boolean;
  @ApiPropertyOptional()
  createdAt: Date;
}
