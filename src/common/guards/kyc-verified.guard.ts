import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { KycService } from '../../modules/kyc/kyc.service';
import { JwtPayload } from '../decorators/current-user.decorator';

const ADMIN_ROLE = 'admin';

@Injectable()
export class KycVerifiedGuard implements CanActivate {
  constructor(private readonly kycService: KycService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;
    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }
    if (user.role === ADMIN_ROLE) {
      return true;
    }
    const verified = await this.kycService.isVerified(user.id);
    if (!verified) {
      throw new ForbiddenException('KYC verification required for trading');
    }
    return true;
  }
}
