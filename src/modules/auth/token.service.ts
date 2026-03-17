import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

export interface TokenSignPayload {
  id: string;
  email: string;
  role: string;
  isActivated: boolean;
  tokenVersion: number;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  sign(payload: TokenSignPayload): string {
    return this.jwtService.sign({
      sub: payload.id,
      email: payload.email,
      role: payload.role,
      isActivated: payload.isActivated,
      tokenVersion: payload.tokenVersion,
    });
  }

  verify(token: string): JwtPayload {
    const decoded = this.jwtService.verify<{
      sub: string;
      email: string;
      role: string;
      isActivated?: boolean;
      tokenVersion?: number;
    }>(token);
    return {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role ?? 'user',
      isActivated: decoded.isActivated,
      tokenVersion: decoded.tokenVersion,
    };
  }

  decode(token: string): JwtPayload | null {
    try {
      const decoded = this.jwtService.decode(token) as Record<string, unknown> | null;
      if (!decoded || !decoded.sub) return null;
      return {
        id: decoded.sub as string,
        email: (decoded.email as string) ?? '',
        role: (decoded.role as string) ?? 'user',
        isActivated: decoded.isActivated as boolean | undefined,
        tokenVersion: decoded.tokenVersion as number | undefined,
      };
    } catch {
      return null;
    }
  }
}
