import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { IS_PUBLIC } from './decorators';
import { clearSessionCookie, clientInfo, readSessionCookie, setSessionCookie } from './session-cookie';
import { SessionService } from './session.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: unknown }>();
    const res = http.getResponse<Response>();

    const cookie = readSessionCookie(req);
    const result = await this.sessions.validate(cookie, clientInfo(req));
    if (!result) {
      if (cookie) clearSessionCookie(res);
      throw new UnauthorizedException('نشست شما منقضی شده است. دوباره وارد شوید.');
    }

    if (result.renewed) setSessionCookie(res, result.renewed);
    req.user = result.user;
    return true;
  }
}
