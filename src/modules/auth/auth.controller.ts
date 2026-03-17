import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
