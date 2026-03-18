import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Base DTO for list endpoints (api query middleware: select, sort, page, limit).
 * Controllers can extend this and add entity-specific filter fields (e.g. role, type).
 */
export class ListQueryDto {
  @ApiPropertyOptional({ description: 'Comma-separated fields to select' })
  @IsOptional()
  @IsString()
  select?: string;

  @ApiPropertyOptional({ description: 'Sort: -field for DESC, field for ASC; comma-separated (e.g. -createdAt,name)' })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 25, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;
}
