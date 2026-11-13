import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { User } from '../../modules/users/entities/user.entity';
import type { AuthenticatedRequest } from '../types/authenticated-request';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
