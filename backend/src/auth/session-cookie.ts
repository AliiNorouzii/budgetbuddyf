import type { CookieOptions, Request, Response } from 'express';
import { IssuedSession, SESSION_COOKIE } from './session.service';

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
  };
}

export function setSessionCookie(res: Response, session: IssuedSession): void {
  res.cookie(SESSION_COOKIE, session.cookie, {
    ...baseOptions(),
    expires: session.expiresAt,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, baseOptions());
}

export function readSessionCookie(req: Request): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
}

export function clientInfo(req: Request) {
  return { userAgent: req.get('user-agent'), ip: req.ip };
}
