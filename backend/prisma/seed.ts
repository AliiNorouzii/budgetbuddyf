/**
 * Seeds realistic demo data (3 users, ~3 months of transactions each).
 *
 *   npx prisma db seed                 → only if the database is empty
 *   SEED_RESET=true npx prisma db seed → wipe and re-seed
 *
 * The random generator is seeded, so the same "today" always yields the same data.
 */
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { AccountType, PrismaClient, TransactionType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { generateRandId } from '../src/common/rand-id';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const DEMO_PASSWORD = 'Demo@1234';
const DAY = 24 * 60 * 60 * 1000;

// Deterministic PRNG (mulberry32)
let state = 20260925;
function rand(): number {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (min: number, max: number, step = 1000) => Math.round((min + rand() * (max - min)) / step) * step;
const pick = <T>(items: T[]): T => items[Math.floor(rand() * items.length)];

/** randIds that are unique within this run and encode their row's creation day. */
const usedIds = new Set<string>();
function randIdFor(date: Date): string {
  for (;;) {
    const id = generateRandId(date);
    if (!usedIds.has(id)) {
      usedIds.add(id);
      return id;
    }
  }
}

const CATEGORIES = [
  { key: 'salary', name: 'حقوق', color: '#16a34a', icon: 'Briefcase' },
  { key: 'freelance', name: 'پروژه آزاد', color: '#0d9488', icon: 'Laptop' },
  { key: 'groceries', name: 'خواربار', color: '#f97316', icon: 'ShoppingCart' },
  { key: 'restaurant', name: 'رستوران و کافه', color: '#ef4444', icon: 'Utensils' },
  { key: 'transport', name: 'حمل‌ونقل', color: '#3b82f6', icon: 'Car' },
  { key: 'rent', name: 'اجاره و مسکن', color: '#8b5cf6', icon: 'Home' },
  { key: 'bills', name: 'قبوض', color: '#eab308', icon: 'Receipt' },
  { key: 'health', name: 'سلامت و درمان', color: '#ec4899', icon: 'HeartPulse' },
  { key: 'education', name: 'آموزش', color: '#6366f1', icon: 'GraduationCap' },
  { key: 'fun', name: 'تفریح', color: '#14b8a6', icon: 'Film' },
  { key: 'clothing', name: 'پوشاک', color: '#a855f7', icon: 'Shirt' },
  { key: 'gifts', name: 'هدیه', color: '#f43f5e', icon: 'Gift' },
] as const;
type CategoryKey = (typeof CATEGORIES)[number]['key'];

const USERS = [
  { name: 'سارا محمدی', email: 'demo@budgetbuddy.ir', salary: 38_000_000, rent: 14_000_000, freelance: true },
  { name: 'رضا احمدی', email: 'reza@budgetbuddy.ir', salary: 29_000_000, rent: 9_500_000, freelance: false },
  { name: 'مریم کریمی', email: 'maryam@budgetbuddy.ir', salary: 45_000_000, rent: 0, freelance: true },
];

const ACCOUNTS: { name: string; type: AccountType }[] = [
  { name: 'حساب بانک ملت', type: AccountType.BANK },
  { name: 'کارت بانک سامان', type: AccountType.CARD },
  { name: 'کیف پول نقدی', type: AccountType.CASH },
  { name: 'کیف پول دیجیتال', type: AccountType.DIGITAL_WALLET },
];

// Typical spending: [category, description options, min, max, times per month]
const SPENDING: [CategoryKey, string[], number, number, number][] = [
  ['groceries', ['خرید هفتگی از فروشگاه', 'میوه و تره‌بار', 'خرید از هایپراستار', 'نان و لبنیات'], 250_000, 2_800_000, 8],
  ['restaurant', ['ناهار با همکاران', 'کافه با دوستان', 'سفارش غذا از اسنپ‌فود', 'پیتزا'], 180_000, 1_600_000, 5],
  ['transport', ['تاکسی اینترنتی', 'شارژ کارت مترو', 'بنزین', 'کارواش'], 60_000, 1_200_000, 7],
  ['bills', ['قبض برق', 'قبض گاز', 'اینترنت خانگی', 'شارژ تلفن همراه'], 150_000, 900_000, 3],
  ['health', ['داروخانه', 'ویزیت پزشک', 'دندانپزشکی'], 200_000, 3_500_000, 1],
  ['education', ['دوره آنلاین برنامه‌نویسی', 'خرید کتاب', 'کلاس زبان'], 400_000, 4_000_000, 1],
  ['fun', ['سینما', 'اشتراک فیلیمو', 'بازی کامپیوتری', 'کنسرت'], 150_000, 2_000_000, 2],
  ['clothing', ['کفش ورزشی', 'پیراهن', 'کاپشن'], 600_000, 4_500_000, 1],
  ['gifts', ['هدیه تولد', 'گل و شیرینی'], 300_000, 2_500_000, 1],
];

async function seedUser(u: (typeof USERS)[number], passwordHash: string, today: Date) {
  const start = new Date(today.getTime() - 92 * DAY);

  const user = await prisma.user.create({
    data: {
      randId: randIdFor(start),
      email: u.email,
      name: u.name,
      createdAt: start,
      credential: { create: { passwordHash } },
    },
  });

  const accounts: { rowId: bigint }[] = [];
  for (const a of ACCOUNTS) {
    accounts.push(
      await prisma.account.create({
        data: { randId: randIdFor(start), userRowId: user.rowId, name: a.name, type: a.type, createdAt: start },
      }),
    );
  }
  const [bank, card, cash, wallet] = accounts;

  const categories = new Map<CategoryKey, bigint>();
  for (const c of CATEGORIES) {
    const row = await prisma.category.create({
      data: { randId: randIdFor(start), userRowId: user.rowId, name: c.name, color: c.color, icon: c.icon, createdAt: start },
    });
    categories.set(c.key, row.rowId);
  }

  type Tx = { type: TransactionType; amount: number; date: Date; category: CategoryKey; account: bigint; description: string };
  const txs: Tx[] = [];

  // Walk month by month through the last ~3 months up to today.
  for (let m = 2; m >= 0; m--) {
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - m, 1));
    const daysInMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
    const lastDay = m === 0 ? today.getUTCDate() : daysInMonth;
    const dayOf = (d: number) =>
      new Date(monthStart.getTime() + (Math.min(d, lastDay) - 1) * DAY + between(8, 21, 1) * 3600_000);

    txs.push({ type: 'INCOME', amount: u.salary, date: dayOf(1), category: 'salary', account: bank.rowId, description: 'واریز حقوق ماهانه' });
    if (u.freelance && lastDay >= 15) {
      txs.push({
        type: 'INCOME',
        amount: between(6_000_000, 18_000_000, 500_000),
        date: dayOf(between(10, 25, 1)),
        category: 'freelance',
        account: wallet.rowId,
        description: pick(['طراحی وب‌سایت', 'پروژه ترجمه', 'مشاوره فنی', 'توسعه اپلیکیشن']),
      });
    }
    if (u.rent > 0) {
      txs.push({ type: 'EXPENSE', amount: u.rent, date: dayOf(3), category: 'rent', account: bank.rowId, description: 'اجاره ماهانه خانه' });
    }

    for (const [category, descriptions, min, max, perMonth] of SPENDING) {
      const count = Math.max(0, Math.round(perMonth * (0.6 + rand() * 0.8) * (lastDay / daysInMonth)));
      for (let i = 0; i < count; i++) {
        txs.push({
          type: 'EXPENSE',
          amount: between(min, max),
          date: dayOf(1 + Math.floor(rand() * lastDay)),
          category,
          account: pick([card.rowId, card.rowId, bank.rowId, cash.rowId, wallet.rowId]),
          description: pick(descriptions),
        });
      }
    }
  }

  txs.sort((a, b) => a.date.getTime() - b.date.getTime());
  await prisma.transaction.createMany({
    data: txs.map((t) => ({
      randId: randIdFor(t.date),
      userRowId: user.rowId,
      accountRowId: t.account,
      categoryRowId: categories.get(t.category)!,
      type: t.type,
      amount: BigInt(t.amount),
      transactionDate: t.date,
      description: t.description,
      createdAt: t.date,
    })),
  });

  // Monthly budgets for the current and previous month.
  const budgetLimits: [CategoryKey, number][] = [
    ['groceries', 9_000_000],
    ['restaurant', 4_000_000],
    ['transport', 3_000_000],
    ['fun', 2_500_000],
    ['bills', 2_000_000],
  ];
  for (let m = 1; m >= 0; m--) {
    const month = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - m, 1)).toISOString().slice(0, 7);
    await prisma.budget.createMany({
      data: budgetLimits.map(([key, limit]) => ({
        randId: randIdFor(start),
        userRowId: user.rowId,
        categoryRowId: categories.get(key)!,
        month,
        limitAmount: BigInt(limit),
      })),
    });
  }

  return txs.length;
}

async function main() {
  const reset = process.env.SEED_RESET === 'true';
  if (!reset && (await prisma.user.count()) > 0) {
    console.log('Database already has data — skipping seed (set SEED_RESET=true to re-seed).');
    return;
  }
  if (reset) {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "app"."transactions", "app"."budgets", "app"."categories", "app"."accounts", "auth"."sessions", "auth"."credentials", "app"."users" RESTART IDENTITY CASCADE',
    );
  }

  const today = new Date();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const u of USERS) {
    const count = await seedUser(u, passwordHash, today);
    console.log(`Seeded ${u.email} with ${count} transactions`);
  }
  console.log(`Done. Log in with any seeded email and password "${DEMO_PASSWORD}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
