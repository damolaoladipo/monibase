import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register and trigger OTP email' })
  @ApiResponse({ status: 201, description: 'Check email for OTP' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
  }

  @Public()
  @Post('verify')
  async verify(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.otp, dto.type);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Body() _dto: LoginDto, @CurrentUser() user: User) {
    return this.authService.login(user);
  }

  @Post('logout')
  async logout(@CurrentUser() user: JwtPayload) {
    return this.authService.logout(user.id);
  }

  @Post('deactivate')
  @ApiOperation({ summary: 'Deactivate account (self or target user if admin)' })
  async deactivate(
    @CurrentUser() payload: JwtPayload,
    @Body() body: { userId?: string },
  ) {
    const targetId = body?.userId ?? payload.id;
    const isSelf = targetId === payload.id;
    const isAdmin =
      payload.role === 'admin' || payload.role === 'super-admin';
    if (!isSelf && !isAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    const user = await this.userService.findById(targetId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.authService.deactivateAccount(user);
    return { message: 'Account deactivated' };
  }

  @Post('refresh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh JWT if near expiry' })
  @ApiResponse({ status: 200, description: 'New or current token' })
  async refresh(@CurrentUser() payload: JwtPayload, @Req() req: Request) {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const result = this.tokenService.refreshToken(accessToken, {
      id: payload.id,
      email: payload.email,
      role: payload.role ?? 'user',
      isActivated: payload.isActivated ?? false,
      tokenVersion: payload.tokenVersion ?? 0,
    });
    if (result.token !== accessToken && req.res) {
      req.res.setHeader('X-New-Token', result.token);
    }
    return { token: result.token };
  }
}
