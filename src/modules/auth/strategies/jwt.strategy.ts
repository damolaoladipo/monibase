import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
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
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtStrategyPayload): JwtPayload {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token');
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role ?? 'user',
      isActivated: payload.isActivated,
      tokenVersion: payload.tokenVersion,
    };
  }
}
