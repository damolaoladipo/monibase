import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { UserService } from '../../user/user.service';
import { AuthService } from '../auth.service';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<User> {
    const user = await this.userService.findByEmail(email, true);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.authService.checkLockedStatus(user);
    const freshUser = await this.userService.findByEmail(email, true);
    if (!freshUser?.isActive || freshUser.isLocked) {
      throw new UnauthorizedException('Account is locked or inactive');
    }
    const valid = await this.userService.comparePassword(password, freshUser.password);
    if (!valid) {
      await this.authService.increaseLoginLimit(freshUser);
      throw new UnauthorizedException('Invalid credentials');
    }
    return freshUser;
  }
}
