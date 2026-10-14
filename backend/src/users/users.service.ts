import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userRowId: bigint, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { rowId: userRowId },
      data: { name: dto.name.trim() },
      select: { randId: true, name: true, email: true, createdAt: true },
    });
    return { id: user.randId, name: user.name, email: user.email, createdAt: user.createdAt };
  }
}
