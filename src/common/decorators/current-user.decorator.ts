import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  isActivated?: boolean;
  tokenVersion?: number;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return data ? user?.[data] : user;
  },
);
