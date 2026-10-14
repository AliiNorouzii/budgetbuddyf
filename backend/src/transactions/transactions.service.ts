import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { AccountsService } from '../accounts/accounts.service';
import { CategoriesService } from '../categories/categories.service';
import { currentMonth, monthRange, previousMonths } from '../common/month';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

const include = {
  account: { select: { randId: true, name: true } },
  category: { select: { randId: true, name: true, color: true, icon: true } },
} satisfies Prisma.TransactionInclude;

type TransactionRow = Prisma.TransactionGetPayload<{ include: typeof include }>;

const toDto = (t: TransactionRow) => ({
  id: t.randId,
  type: t.type,
  amount: Number(t.amount),
  transactionDate: t.transactionDate,
  description: t.description,
  account: { id: t.account.randId, name: t.account.name },
  category: t.category
    ? { id: t.category.randId, name: t.category.name, color: t.category.color, icon: t.category.icon }
    : null,
  createdAt: t.createdAt,
});

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
    private readonly categories: CategoriesService,
  ) {}

  async findAll(userRowId: bigint, q: ListTransactionsDto) {
    const where: Prisma.TransactionWhereInput = {
      userRowId,
      type: q.type,
      account: q.accountId ? { randId: q.accountId } : undefined,
      category: q.categoryId ? { randId: q.categoryId } : undefined,
      transactionDate: q.from || q.to ? { gte: q.from ? new Date(q.from) : undefined, lte: q.to ? new Date(q.to) : undefined } : undefined,
      description: q.q ? { contains: q.q, mode: 'insensitive' } : undefined,
    };
    const rows = await this.prisma.transaction.findMany({
      where,
      include,
      orderBy: [{ transactionDate: 'desc' }, { rowId: 'desc' }],
      take: q.limit ?? 200,
    });
    return rows.map(toDto);
  }

  async create(userRowId: bigint, dto: CreateTransactionDto) {
    const account = await this.accounts.findOwned(userRowId, dto.accountId);
    const category = dto.categoryId ? await this.categories.findOwned(userRowId, dto.categoryId) : null;

    const row = await this.prisma.withRandId((randId) =>
      this.prisma.transaction.create({
        data: {
          randId,
          userRowId,
          accountRowId: account.rowId,
          categoryRowId: category?.rowId ?? null,
          type: dto.type,
          amount: BigInt(dto.amount),
          transactionDate: dto.transactionDate ? new Date(dto.transactionDate) : new Date(),
          description: dto.description?.trim() || null,
        },
        include,
      }),
    );
    return toDto(row);
  }

  async update(userRowId: bigint, id: string, dto: UpdateTransactionDto) {
    const current = await this.findOwned(userRowId, id);
    const account = dto.accountId ? await this.accounts.findOwned(userRowId, dto.accountId) : null;
    const categoryRowId =
      dto.categoryId === undefined
        ? undefined
        : dto.categoryId === null
          ? null
          : (await this.categories.findOwned(userRowId, dto.categoryId)).rowId;

    const row = await this.prisma.transaction.update({
      where: { rowId: current.rowId },
      data: {
        type: dto.type,
        amount: dto.amount !== undefined ? BigInt(dto.amount) : undefined,
        accountRowId: account?.rowId,
        categoryRowId,
        transactionDate: dto.transactionDate ? new Date(dto.transactionDate) : undefined,
        description: dto.description !== undefined ? dto.description.trim() || null : undefined,
      },
      include,
    });
    return toDto(row);
  }

  async remove(userRowId: bigint, id: string) {
    const current = await this.findOwned(userRowId, id);
    await this.prisma.transaction.delete({ where: { rowId: current.rowId } });
  }

  /** Everything the dashboard needs, in one request. */
  async summary(userRowId: bigint, month = currentMonth()) {
    const { start, end } = monthRange(month);
    const months = previousMonths(month, 6);
    const trendStart = monthRange(months[0]).start;

    const [monthTotals, allTotals, byCategory, trend, recent] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['type'],
        where: { userRowId, transactionDate: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({ by: ['type'], where: { userRowId }, _sum: { amount: true } }),
      this.prisma.transaction.groupBy({
        by: ['categoryRowId'],
        where: { userRowId, type: TransactionType.EXPENSE, transactionDate: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      this.prisma.$queryRaw<{ month: string; type: TransactionType; total: bigint }[]>`
        SELECT to_char(date_trunc('month', "transactionDate"), 'YYYY-MM') AS month,
               "type", SUM("amount")::bigint AS total
        FROM "app"."transactions"
        WHERE "userRowId" = ${userRowId} AND "transactionDate" >= ${trendStart} AND "transactionDate" < ${end}
        GROUP BY 1, 2`,
      this.prisma.transaction.findMany({
        where: { userRowId },
        include,
        orderBy: [{ transactionDate: 'desc' }, { rowId: 'desc' }],
        take: 6,
      }),
    ]);

    const sumOf = (rows: { type: TransactionType; _sum: { amount: bigint | null } }[], type: TransactionType) =>
      Number(rows.find((r) => r.type === type)?._sum.amount ?? 0n);

    const income = sumOf(monthTotals, TransactionType.INCOME);
    const expense = sumOf(monthTotals, TransactionType.EXPENSE);

    const categoryRows = await this.prisma.category.findMany({
      where: { rowId: { in: byCategory.map((c) => c.categoryRowId).filter((id): id is bigint => id !== null) } },
    });
    const categoryByRowId = new Map(categoryRows.map((c) => [c.rowId, c]));

    return {
      month,
      income,
      expense,
      net: income - expense,
      balance: sumOf(allTotals, TransactionType.INCOME) - sumOf(allTotals, TransactionType.EXPENSE),
      expenseByCategory: byCategory
        .map((c) => {
          const cat = c.categoryRowId !== null ? categoryByRowId.get(c.categoryRowId) : undefined;
          return {
            id: cat?.randId ?? null,
            name: cat?.name ?? 'بدون دسته‌بندی',
            color: cat?.color ?? '#94a3b8',
            amount: Number(c._sum.amount ?? 0n),
          };
        })
        .sort((a, b) => b.amount - a.amount),
      trend: months.map((m) => ({
        month: m,
        income: Number(trend.find((t) => t.month === m && t.type === TransactionType.INCOME)?.total ?? 0n),
        expense: Number(trend.find((t) => t.month === m && t.type === TransactionType.EXPENSE)?.total ?? 0n),
      })),
      recent: recent.map(toDto),
    };
  }

  private async findOwned(userRowId: bigint, id: string) {
    const row = await this.prisma.transaction.findFirst({ where: { randId: id, userRowId } });
    if (!row) throw new NotFoundException('تراکنش موردنظر پیدا نشد.');
    return row;
  }
}
