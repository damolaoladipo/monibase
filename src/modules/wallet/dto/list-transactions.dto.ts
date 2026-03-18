import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ListQueryDto } from '../../../common/query';

/**
 * List transactions with list-query (select, sort, page, limit) plus type and date filters.
 */
export class ListTransactionsDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
