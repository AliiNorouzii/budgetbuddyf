import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { CategoriesService } from '../categories/categories.service';
import { currentMonth, monthRange } from '../common/month';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto, UpdateBudgetDto } from './dto/create-budget.dto';

const include = {
  category: { select: { randId: true, name: true, color: true, icon: true } },
} satisfies Prisma.BudgetInclude;

type BudgetRow = Prisma.BudgetGetPayload<{ include: typeof include }>;

const toDto = (b: BudgetRow, spent: number) => ({
  id: b.randId,
  month: b.month,
  limitAmount: Number(b.limitAmount),
  spent,
  category: { id: b.category.randId, name: b.category.name, color: b.category.color, icon: b.category.icon },
});

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
  ) {}

  /** Budgets of a month, each with what has been spent in its category so far. */
  async findAll(userRowId: bigint, month = currentMonth()) {
    const { start, end } = monthRange(month);
    const budgets = await this.prisma.budget.findMany({
      where: { userRowId, month },
      include,
      orderBy: { rowId: 'asc' },
    });
    const spent = await this.prisma.transaction.groupBy({
      by: ['categoryRowId'],
      where: {
        userRowId,
        type: TransactionType.EXPENSE,
        transactionDate: { gte: start, lt: end },
        categoryRowId: { in: budgets.map((b) => b.categoryRowId) },
      },
      _sum: { amount: true },
    });
    const spentBy = new Map(spent.map((s) => [s.categoryRowId, Number(s._sum.amount ?? 0n)]));
    return budgets.map((b) => toDto(b, spentBy.get(b.categoryRowId) ?? 0));
  }

  async create(userRowId: bigint, dto: CreateBudgetDto) {
    const category = await this.categories.findOwned(userRowId, dto.categoryId);
    try {
      await this.prisma.withRandId((randId) =>
        this.prisma.budget.create({
          data: {
            randId,
            userRowId,
            categoryRowId: category.rowId,
            month: dto.month,
            limitAmount: BigInt(dto.limitAmount),
          },
        }),
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('برای این دسته‌بندی در این ماه قبلاً بودجه تعریف شده است.');
      }
      throw error;
    }
    const budgets = await this.findAll(userRowId, dto.month);
    return budgets.find((b) => b.category.id === dto.categoryId);
  }

  async update(userRowId: bigint, id: string, dto: UpdateBudgetDto) {
    const budget = await this.findOwned(userRowId, id);
    await this.prisma.budget.update({
      where: { rowId: budget.rowId },
      data: { limitAmount: BigInt(dto.limitAmount) },
    });
    return (await this.findAll(userRowId, budget.month)).find((b) => b.id === id);
  }

  async remove(userRowId: bigint, id: string) {
    const budget = await this.findOwned(userRowId, id);
    await this.prisma.budget.delete({ where: { rowId: budget.rowId } });
  }

  private async findOwned(userRowId: bigint, id: string) {
    const budget = await this.prisma.budget.findFirst({ where: { randId: id, userRowId } });
    if (!budget) throw new NotFoundException('بودجه موردنظر پیدا نشد.');
    return budget;
  }
}
