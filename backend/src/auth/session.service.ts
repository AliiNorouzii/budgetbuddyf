import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export const SESSION_COOKIE = 'bb_session';
/** A session dies after 24h without use. */
export const SESSION_IDLE_TTL_MS = 24 * 60 * 60 * 1000;
/** Don't write `lastUsedAt` on every request — at most once per 5 minutes. */
export const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;
/** Even an active session gets a brand-new id + token once a day. */
export const SESSION_ROTATE_AFTER_MS = 24 * 60 * 60 * 1000;
/** A rotated session keeps working this long, for requests sent in parallel with the rotating one. */
export const SESSION_ROTATE_GRACE_MS = 30 * 1000;

export interface AuthUser {
  rowId: bigint;
  id: string; // public randId
  name: string;
  email: string;
}

export interface IssuedSession {
  /** Cookie value: `<session randId>.<raw token>` */
  cookie: string;
  expiresAt: Date;
}

export interface ValidatedSession {
  user: AuthUser;
  /** Set when the cookie must be (re)sent: sliding renewal or rotation. */
  renewed?: IssuedSession;
}

interface ClientInfo {
  userAgent?: string;
  ip?: string;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userRowId: bigint, client: ClientInfo = {}, now = new Date()): Promise<IssuedSession> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(now.getTime() + SESSION_IDLE_TTL_MS);

    const session = await this.prisma.withRandId((randId) =>
      this.prisma.session.create({
        data: {
          randId,
          userRowId,
          tokenHash: hashToken(token),
          createdAt: now,
          lastUsedAt: now,
          expiresAt,
          userAgent: client.userAgent?.slice(0, 255),
          ip: client.ip,
        },
      }),
    );

    return { cookie: `${session.randId}.${token}`, expiresAt };
  }

  async validate(cookie: string | undefined, client: ClientInfo = {}, now = new Date()): Promise<ValidatedSession | null> {
    const parsed = parseCookie(cookie);
    if (!parsed) return null;

    const session = await this.prisma.session.findUnique({
      where: { randId: parsed.randId },
      include: { user: { select: { rowId: true, randId: true, name: true, email: true } } },
    });
    if (!session || !safeEqualHex(session.tokenHash, hashToken(parsed.token))) return null;

    const user: AuthUser = {
      rowId: session.user.rowId,
      id: session.user.randId,
      name: session.user.name,
      email: session.user.email,
    };

    // 24h without use → the session is gone; the user must log in again,
    // which creates a new session id.
    if (session.expiresAt <= now) {
      await this.prisma.session.deleteMany({ where: { rowId: session.rowId } });
      return null;
    }

    // Already replaced by a newer session: requests that were in flight with the
    // old cookie stay valid until the grace period (its shortened expiry) ends.
    if (session.rotatedAt) return { user };

    // Periodic rotation: issue a new row (new randId + token) and retire this one.
    if (now.getTime() - session.createdAt.getTime() >= SESSION_ROTATE_AFTER_MS) {
      const retired = await this.prisma.session.updateMany({
        where: { rowId: session.rowId, rotatedAt: null },
        data: { rotatedAt: now, expiresAt: new Date(now.getTime() + SESSION_ROTATE_GRACE_MS) },
      });
      // A concurrent request won the race and already issued the replacement.
      if (retired.count === 0) return { user };
      return { user, renewed: await this.create(session.userRowId, client, now) };
    }

    // Sliding expiry: every use pushes the deadline 24h forward.
    if (now.getTime() - session.lastUsedAt.getTime() >= SESSION_TOUCH_INTERVAL_MS) {
      const expiresAt = new Date(now.getTime() + SESSION_IDLE_TTL_MS);
      await this.prisma.session.update({
        where: { rowId: session.rowId },
        data: { lastUsedAt: now, expiresAt },
      });
      return { user, renewed: { cookie: cookie!, expiresAt } };
    }

    return { user };
  }

  async revoke(cookie: string | undefined): Promise<void> {
    const parsed = parseCookie(cookie);
    if (!parsed) return;
    await this.prisma.session.deleteMany({
      where: { randId: parsed.randId, tokenHash: hashToken(parsed.token) },
    });
  }

  /** Housekeeping: drop this user's expired sessions (called on login). */
  async purgeExpired(userRowId: bigint, now = new Date()): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userRowId, expiresAt: { lte: now } } });
  }
}

function parseCookie(cookie: string | undefined): { randId: string; token: string } | null {
  if (!cookie) return null;
  const dot = cookie.indexOf('.');
  if (dot !== 6) return null;
  const token = cookie.slice(dot + 1);
  if (!token) return null;
  return { randId: cookie.slice(0, dot), token };
}

function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
