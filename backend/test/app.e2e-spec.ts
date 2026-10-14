import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

/**
 * Full HTTP flow against a real PostgreSQL database (TEST_DATABASE_URL,
 * migrated by test/global-setup.ts).
 */
describe('BudgetBuddy API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const register = async (email: string) => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Secret@123', name: 'کاربر تست' })
      .expect(201);
    const cookie = [res.get('Set-Cookie')!].flat().find((c) => c.startsWith('bb_session='))!;
    return { user: res.body.user, cookie: cookie.split(';')[0] };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.$executeRawUnsafe(
      'TRUNCATE "app"."transactions", "app"."budgets", "app"."categories", "app"."accounts", "auth"."sessions", "auth"."credentials", "app"."users" RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps profile and password hash in different schemas, linked by id', async () => {
    const { user } = await register('schema@test.ir');
    expect(user.id).toMatch(/^[0-9a-z]{6}$/);

    const [profile] = await prisma.$queryRaw<Record<string, unknown>[]>`SELECT * FROM "app"."users" WHERE "randId" = ${user.id}`;
    expect(Object.keys(profile)).not.toContain('passwordHash');

    const [cred] = await prisma.$queryRaw<{ passwordHash: string }[]>`
      SELECT c."passwordHash" FROM "auth"."credentials" c WHERE c."userRowId" = ${profile.rowId}`;
    expect(cred.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects reading the auth schema from the restricted role', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE budgetbuddy_readonly');
        await tx.$queryRawUnsafe('SELECT * FROM "auth"."credentials"');
      }),
    ).rejects.toThrow(/permission denied/i);

    const users = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL ROLE budgetbuddy_readonly');
      return tx.$queryRawUnsafe<unknown[]>('SELECT email FROM "app"."users"');
    });
    expect(users.length).toBeGreaterThan(0);
  });

  it('login sets an httpOnly session cookie whose token is stored only as a hash', async () => {
    await register('login@test.ir');
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'login@test.ir', password: 'Secret@123' })
      .expect(200);

    const setCookie = [res.get('Set-Cookie')!].flat().join(';');
    expect(setCookie).toMatch(/bb_session=/);
    expect(setCookie).toMatch(/HttpOnly/i);

    const [randId, token] = setCookie.match(/bb_session=([^;]+)/)![1].split('.');
    const session = await prisma.session.findUnique({ where: { randId } });
    expect(session).not.toBeNull();
    expect(session!.tokenHash).not.toContain(token);

    await request(app.getHttpServer()).post('/auth/login').send({ email: 'login@test.ir', password: 'wrong' }).expect(401);
  });

  it('protects routes and scopes data to the logged-in user', async () => {
    await request(app.getHttpServer()).get('/transactions').expect(401);

    const alice = await register('alice@test.ir');
    const bob = await register('bob@test.ir');

    const account = await request(app.getHttpServer())
      .post('/accounts')
      .set('Cookie', alice.cookie)
      .send({ name: 'بانک', type: 'BANK' })
      .expect(201);
    const category = await request(app.getHttpServer())
      .post('/categories')
      .set('Cookie', alice.cookie)
      .send({ name: 'خوراک', color: '#f97316' })
      .expect(201);

    const tx = await request(app.getHttpServer())
      .post('/transactions')
      .set('Cookie', alice.cookie)
      .send({ type: 'EXPENSE', amount: 250000, accountId: account.body.id, categoryId: category.body.id, description: 'خرید' })
      .expect(201);
    expect(tx.body.id).toMatch(/^[0-9a-z]{6}$/);
    expect(tx.body).not.toHaveProperty('rowId');

    const summary = await request(app.getHttpServer()).get('/transactions/summary').set('Cookie', alice.cookie).expect(200);
    expect(summary.body.expense).toBe(250000);
    expect(summary.body.recent[0].id).toBe(tx.body.id);

    // Bob sees nothing of Alice's and can't touch it.
    const bobList = await request(app.getHttpServer()).get('/transactions').set('Cookie', bob.cookie).expect(200);
    expect(bobList.body).toEqual([]);
    await request(app.getHttpServer()).delete(`/transactions/${tx.body.id}`).set('Cookie', bob.cookie).expect(404);
    await request(app.getHttpServer())
      .post('/transactions')
      .set('Cookie', bob.cookie)
      .send({ type: 'INCOME', amount: 1, accountId: account.body.id })
      .expect(404);
  });

  it('expires a session after 24h without use', async () => {
    const { cookie } = await register('idle@test.ir');
    const randId = cookie.split('=')[1].split('.')[0];

    await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookie).expect(200);
    await prisma.session.update({
      where: { randId },
      data: { lastUsedAt: new Date(Date.now() - 25 * 3600_000), expiresAt: new Date(Date.now() - 3600_000) },
    });

    await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookie).expect(401);
    expect(await prisma.session.findUnique({ where: { randId } })).toBeNull();
  });

  it('logout revokes the session', async () => {
    const { cookie } = await register('logout@test.ir');
    await request(app.getHttpServer()).post('/auth/logout').set('Cookie', cookie).expect(204);
    await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookie).expect(401);
  });
});
