import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../user/entities/user.entity';
import { FxQuoteService } from './fx-quote.service';
import { FxQuotesQueryDto } from './dto/fx-quotes-query.dto';
import { FxQuoteDebugResponseDto } from './dto/fx-quote-response.dto';

@ApiTags('fx-admin')
@ApiBearerAuth()
@Controller('admin/fx')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class FxAdminController {
  constructor(private readonly fxQuoteService: FxQuoteService) {}

  @Get('quote-debug')
  @ApiOperation({
    summary: 'Admin FX quote debug',
    description:
      'Same quotes as public /fx/quotes plus stale flag, rate base, mid-market rate reference, and source metadata.',
  })
  @ApiOkResponse({ type: FxQuoteDebugResponseDto })
  async quoteDebug(@Query() query: FxQuotesQueryDto): Promise<FxQuoteDebugResponseDto> {
    return this.fxQuoteService.buildQuoteDebug(
      query.sourceCurrency,
      query.targetCurrency,
      query.amount,
    );
  }
}
