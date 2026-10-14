import { Injectable, NotFoundException } from '@nestjs/common';
import { Account, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

const toDto = (a: Account, balance = 0) => ({
  id: a.randId,
  name: a.name,
  type: a.type,
  balance,
  createdAt: a.createdAt,
});

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userRowId: bigint) {
    const [accounts, sums] = await Promise.all([
      this.prisma.account.findMany({ where: { userRowId }, orderBy: { rowId: 'asc' } }),
      this.prisma.transaction.groupBy({
        by: ['accountRowId', 'type'],
        where: { userRowId },
        _sum: { amount: true },
      }),
    ]);

    const balances = new Map<bigint, number>();
    for (const s of sums) {
      const value = Number(s._sum.amount ?? 0n) * (s.type === TransactionType.INCOME ? 1 : -1);
      balances.set(s.accountRowId, (balances.get(s.accountRowId) ?? 0) + value);
    }
    return accounts.map((a) => toDto(a, balances.get(a.rowId) ?? 0));
  }

  async create(userRowId: bigint, dto: CreateAccountDto) {
    const account = await this.prisma.withRandId((randId) =>
      this.prisma.account.create({ data: { randId, userRowId, name: dto.name.trim(), type: dto.type } }),
    );
    return toDto(account);
  }

  async update(userRowId: bigint, id: string, dto: UpdateAccountDto) {
    const account = await this.findOwned(userRowId, id);
    return toDto(
      await this.prisma.account.update({
        where: { rowId: account.rowId },
        data: { name: dto.name?.trim(), type: dto.type },
      }),
    );
  }

  async remove(userRowId: bigint, id: string) {
    const account = await this.findOwned(userRowId, id);
    await this.prisma.account.delete({ where: { rowId: account.rowId } });
  }

  async findOwned(userRowId: bigint, id: string) {
    const account = await this.prisma.account.findFirst({ where: { randId: id, userRowId } });
    if (!account) throw new NotFoundException('حساب موردنظر پیدا نشد.');
    return account;
  }
}
