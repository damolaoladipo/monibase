import {
  Controller,
  Get,
  Delete,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from './entities/user.entity';
import { UserService } from './user.service';
import { parseListQuery } from '../../common/query';
import { buildListResult } from '../../common/query';

@ApiTags('user')
@ApiBearerAuth()
@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('user/profile')
  @ApiOperation({ summary: 'Get current user profile (cached)' })
  async getProfile(@CurrentUser() payload: JwtPayload) {
    const profile = await this.userService.getProfileWithCache(payload.id);
    if (!profile) {
      throw new NotFoundException('User not found');
    }
    return profile;
  }

  @Delete('user/deactivate')
  @ApiOperation({ summary: 'Deactivate current user account' })
  async deactivate(@CurrentUser() payload: JwtPayload) {
    await this.userService.deactivate(payload.id);
    return { message: 'User account deactivated successfully.' };
  }

  @Get('users')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List users (admin, cached). Query: select, sort, page, limit, role, includeDeactivated' })
  async list(@CurrentUser() _payload: JwtPayload, @Query() query: Record<string, unknown>) {
    const parsed = parseListQuery(query);
    const role = (parsed.filter.role as string) || undefined;
    const includeDeactivated =
      parsed.filter.includeDeactivated === 'true' ||
      parsed.filter.includeDeactivated === true ||
      parsed.filter.includeDeactivated === '1';
    const result = await this.userService.findAllPaginatedWithCache({
      page: parsed.page,
      limit: parsed.limit,
      sort:
        parsed.sort.length > 0
          ? { field: parsed.sort[0].field, order: parsed.sort[0].order }
          : undefined,
      role,
      includeDeactivated: Boolean(includeDeactivated),
    });
    return buildListResult(result.items, result.total, parsed);
  }
}
