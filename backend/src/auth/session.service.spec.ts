import { PrismaService, withRandId } from '../prisma/prisma.service';
import {
  hashToken,
  SESSION_IDLE_TTL_MS,
  SESSION_ROTATE_AFTER_MS,
  SESSION_ROTATE_GRACE_MS,
  SESSION_TOUCH_INTERVAL_MS,
  SessionService,
} from './session.service';

type Row = {
  rowId: bigint;
  randId: string;
  userRowId: bigint;
  tokenHash: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  rotatedAt?: Date | null;
};

/** Minimal in-memory stand-in for the parts of Prisma the service uses. */
function fakePrisma() {
  const rows: Row[] = [];
  let nextId = 1n;
  const user = { rowId: 7n, randId: 'abc123', name: 'Test', email: 't@example.com' };
  const match = (r: Row, where: Record<string, unknown>) =>
    Object.entries(where).every(([k, v]) => {
      const value = (r as Record<string, unknown>)[k] ?? null;
      if (v && typeof v === 'object' && 'lte' in v) return (value as Date) <= (v.lte as Date);
      return value === v;
    });

  const prisma = {
    withRandId,
    session: {
      create: jest.fn(({ data }) => {
        const row = { rowId: nextId++, ...data } as Row;
        rows.push(row);
        return Promise.resolve(row);
      }),
      findUnique: jest.fn(({ where }) => Promise.resolve(rows.find((r) => r.randId === where.randId) ? { ...rows.find((r) => r.randId === where.randId), user } : null)),
      update: jest.fn(({ where, data }) => {
        const row = rows.find((r) => r.rowId === where.rowId)!;
        Object.assign(row, data);
        return Promise.resolve(row);
      }),
      updateMany: jest.fn(({ where, data }) => {
        const matched = rows.filter((r) => match(r, where));
        for (const row of matched) Object.assign(row, data);
        return Promise.resolve({ count: matched.length });
      }),
      deleteMany: jest.fn(({ where }) => {
        const before = rows.length;
        for (let i = rows.length - 1; i >= 0; i--) if (match(rows[i], where)) rows.splice(i, 1);
        return Promise.resolve({ count: before - rows.length });
      }),
    },
  };
  return { prisma: prisma as unknown as PrismaService, rows };
}

describe('SessionService', () => {
  const t0 = new Date('2026-09-25T10:00:00Z');
  const at = (ms: number) => new Date(t0.getTime() + ms);

  it('stores only the sha256 of the token, never the token itself', async () => {
    const { prisma, rows } = fakePrisma();
    const { cookie } = await new SessionService(prisma).create(7n, {}, t0);

    const [randId, token] = cookie.split('.');
    expect(rows).toHaveLength(1);
    expect(rows[0].randId).toBe(randId);
    expect(rows[0].tokenHash).toBe(hashToken(token));
    expect(Object.values(rows[0]).map(String).join('|')).not.toContain(token);
    expect(rows[0].expiresAt).toEqual(at(SESSION_IDLE_TTL_MS));
  });

  it('accepts a valid cookie and rejects a tampered one', async () => {
    const { prisma } = fakePrisma();
    const service = new SessionService(prisma);
    const { cookie } = await service.create(7n, {}, t0);

    expect((await service.validate(cookie, {}, at(1000)))?.user.id).toBe('abc123');
    expect(await service.validate(cookie.slice(0, -1) + 'x', {}, at(1000))).toBeNull();
    expect(await service.validate('garbage', {}, at(1000))).toBeNull();
    expect(await service.validate(undefined, {}, at(1000))).toBeNull();
  });

  it('slides the expiry forward when the session is used', async () => {
    const { prisma, rows } = fakePrisma();
    const service = new SessionService(prisma);
    const { cookie } = await service.create(7n, {}, t0);

    const useAt = at(SESSION_TOUCH_INTERVAL_MS + 1000);
    const result = await service.validate(cookie, {}, useAt);
    expect(result?.renewed?.cookie).toBe(cookie);
    expect(rows[0].expiresAt).toEqual(new Date(useAt.getTime() + SESSION_IDLE_TTL_MS));
  });

  it('expires after 24h without use and deletes the row', async () => {
    const { prisma, rows } = fakePrisma();
    const service = new SessionService(prisma);
    const { cookie } = await service.create(7n, {}, t0);

    expect(await service.validate(cookie, {}, at(SESSION_IDLE_TTL_MS + 1))).toBeNull();
    expect(rows).toHaveLength(0);
  });

  it('rotates to a new session id after 24h of continuous use', async () => {
    const { prisma, rows } = fakePrisma();
    const service = new SessionService(prisma);
    const first = await service.create(7n, {}, t0);

    // keep it alive with a request every 12h
    await service.validate(first.cookie, {}, at(12 * 3600_000));
    const result = await service.validate(first.cookie, {}, at(SESSION_ROTATE_AFTER_MS + 1000));

    expect(result?.renewed).toBeDefined();
    expect(result!.renewed!.cookie.split('.')[0]).not.toBe(first.cookie.split('.')[0]);
    expect((await service.validate(result!.renewed!.cookie, {}, at(SESSION_ROTATE_AFTER_MS + 2000)))?.user.id).toBe('abc123');

    // The old cookie dies once the grace period is over.
    expect(await service.validate(first.cookie, {}, at(SESSION_ROTATE_AFTER_MS + 1000 + SESSION_ROTATE_GRACE_MS + 1))).toBeNull();
    expect(rows).toHaveLength(1);
  });

  it('keeps parallel requests with the old cookie signed in while rotating, and rotates only once', async () => {
    const { prisma, rows } = fakePrisma();
    const service = new SessionService(prisma);
    const first = await service.create(7n, {}, t0);
    await service.validate(first.cookie, {}, at(12 * 3600_000));

    const now = at(SESSION_ROTATE_AFTER_MS + 1000);
    const results = await Promise.all([1, 2, 3, 4].map(() => service.validate(first.cookie, {}, now)));

    expect(results.every((r) => r?.user.id === 'abc123')).toBe(true);
    expect(results.filter((r) => r?.renewed)).toHaveLength(1);
    expect(rows).toHaveLength(2);
  });

  it('revoke removes the session', async () => {
    const { prisma, rows } = fakePrisma();
    const service = new SessionService(prisma);
    const { cookie } = await service.create(7n, {}, t0);
    await service.revoke(cookie);
    expect(rows).toHaveLength(0);
  });
});
