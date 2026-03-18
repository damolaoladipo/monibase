import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { parseListQuery } from './parse-list-query.util';
import { ParsedListQuery } from './list-query.types';

/**
 * Pipe that transforms query object from request into ParsedListQuery (api query middleware equivalent).
 * Use with @Query() in list endpoints.
 */
@Injectable()
export class ParseListQueryPipe implements PipeTransform<Record<string, unknown>, ParsedListQuery> {
  transform(value: Record<string, unknown>, _metadata: ArgumentMetadata): ParsedListQuery {
    return parseListQuery(value ?? {});
  }
}
