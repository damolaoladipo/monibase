import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../../user/user.service';
import { JwtPayload } from '../../../common/decorators/current-user.decorator';

export interface JwtStrategyPayload {
  sub: string;
  email: string;
  role: string;
  isActivated?: boolean;
  tokenVersion?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtStrategyPayload): Promise<JwtPayload> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token');
    }
    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account inactive');
    }
    const tokenVersion = payload.tokenVersion ?? 0;
    if (user.tokenVersion !== tokenVersion) {
      throw new UnauthorizedException('Token invalidated');
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActivated: user.isActivated,
      tokenVersion: user.tokenVersion,
    };
  }
}
