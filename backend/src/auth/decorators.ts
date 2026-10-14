import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from './session.service';

export const IS_PUBLIC = 'isPublic';
/** Opt a route out of the global SessionGuard. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** The user resolved from the session cookie by SessionGuard. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<Request & { user: AuthUser }>().user,
);
