import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../users/users.service.fixed';
import { REQUIRE_MFA_KEY } from './require-mfa.decorator';

@Injectable()
export class MfaGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Check if MFA is required for this route
    const requireMfa = this.reflector.get<boolean>(REQUIRE_MFA_KEY, context.getHandler());

    if (requireMfa) {
      const fullUser = await this.userService.findOne(user.id);

      if (!fullUser.mfaEnabled) {
        throw new UnauthorizedException('MFA is required for this action');
      }

      // Check if MFA verification has been completed in this session
      if (!request.session?.mfaVerified) {
        throw new UnauthorizedException('MFA verification required');
      }
    }

    return true;
  }
}
