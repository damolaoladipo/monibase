import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { UserService } from '../user/user.service';
import { User } from '../user/entities/user.entity';
import { OtpType } from '../user/entities/user.entity';
import { TokenService } from './token.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  generateOtp(): string {
    return randomBytes(OTP_LENGTH).toString('hex').slice(0, OTP_LENGTH).toUpperCase();
  }

  async register(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ message: string }> {
    const user = await this.userService.createUser({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
    });
    const otp = this.generateOtp();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + OTP_EXPIRY_MINUTES);
    await this.userService.update(user.id, {
      otp,
      otpExpiry: expiry,
      otpType: OtpType.EMAIL_VERIFICATION,
    });
    return { message: 'Check email for OTP' };
  }

  async verifyOtp(email: string, otp: string, type: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid email or OTP');
    }
    if (!user.otp || !user.otpExpiry || user.otpType !== type) {
      throw new BadRequestException('Invalid email or OTP');
    }
    if (new Date() > user.otpExpiry) {
      throw new BadRequestException('OTP expired');
    }
    const normalizedOtp = otp.trim().toUpperCase();
    if (user.otp !== normalizedOtp) {
      throw new BadRequestException('Invalid email or OTP');
    }
    await this.userService.update(user.id, {
      otp: null,
      otpExpiry: null,
      otpType: null,
      isActivated: true,
      isActive: true,
    });
    return { message: 'Account verified' };
  }

  async login(user: User): Promise<{ token: string; user: JwtPayload }> {
    await this.userService.update(user.id, { lastLogin: new Date() });
    const token = this.tokenService.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      isActivated: user.isActivated,
      tokenVersion: user.tokenVersion,
    });
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActivated: user.isActivated,
        tokenVersion: user.tokenVersion,
      },
    };
  }

  async logout(userId: string): Promise<{ message: string }> {
    const user = await this.userService.findById(userId);
    if (user) {
      await this.userService.update(userId, { tokenVersion: user.tokenVersion + 1 });
    }
    return { message: 'Logged out' };
  }
}
