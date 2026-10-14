import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const toDto = (c: Category) => ({ id: c.randId, name: c.name, color: c.color, icon: c.icon });

function rethrowDuplicate(error: unknown, name?: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException(`دسته‌بندی «${name}» از قبل وجود دارد.`);
  }
  throw error;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userRowId: bigint) {
    const categories = await this.prisma.category.findMany({ where: { userRowId }, orderBy: { name: 'asc' } });
    return categories.map(toDto);
  }

  async create(userRowId: bigint, dto: CreateCategoryDto) {
    const name = dto.name.trim();
    try {
      const category = await this.prisma.withRandId((randId) =>
        this.prisma.category.create({ data: { randId, userRowId, name, color: dto.color, icon: dto.icon } }),
      );
      return toDto(category);
    } catch (error) {
      rethrowDuplicate(error, name);
    }
  }

  async update(userRowId: bigint, id: string, dto: UpdateCategoryDto) {
    const category = await this.findOwned(userRowId, id);
    const name = dto.name?.trim();
    try {
      return toDto(
        await this.prisma.category.update({
          where: { rowId: category.rowId },
          data: { name, color: dto.color, icon: dto.icon },
        }),
      );
    } catch (error) {
      rethrowDuplicate(error, name);
    }
  }

  async remove(userRowId: bigint, id: string) {
    const category = await this.findOwned(userRowId, id);
    await this.prisma.category.delete({ where: { rowId: category.rowId } });
  }

  async findOwned(userRowId: bigint, id: string) {
    const category = await this.prisma.category.findFirst({ where: { randId: id, userRowId } });
    if (!category) throw new NotFoundException('دسته‌بندی موردنظر پیدا نشد.');
    return category;
  }
}
