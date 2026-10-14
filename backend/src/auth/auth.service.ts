import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 10;
// Compared against when the email is unknown so both paths take the same time.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();

    if (await this.prisma.user.findUnique({ where: { email }, select: { rowId: true } })) {
      throw new ConflictException('کاربری با این ایمیل قبلاً ثبت‌نام کرده است.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Profile goes to app.users, the hash to auth.credentials — linked only by rowId.
    return this.prisma.withRandId((randId) =>
      this.prisma.user.create({
        data: {
          randId,
          email,
          name: dto.name.trim(),
          credential: { create: { passwordHash } },
        },
        select: { rowId: true, randId: true, name: true, email: true },
      }),
    );
  }

  async verifyCredentials(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      select: { rowId: true, randId: true, name: true, email: true },
    });

    const credential = user
      ? await this.prisma.credential.findUnique({
          where: { userRowId: user.rowId },
          select: { passwordHash: true },
        })
      : null;

    const ok = await bcrypt.compare(dto.password, credential?.passwordHash ?? DUMMY_HASH);
    if (!user || !credential || !ok) {
      throw new UnauthorizedException('ایمیل یا کلمه عبور اشتباه است.');
    }
    return user;
  }

  async changePassword(userRowId: bigint, currentPassword: string, newPassword: string) {
    const credential = await this.prisma.credential.findUniqueOrThrow({ where: { userRowId } });
    if (!(await bcrypt.compare(currentPassword, credential.passwordHash))) {
      throw new UnauthorizedException('کلمه عبور فعلی اشتباه است.');
    }
    await this.prisma.$transaction([
      this.prisma.credential.update({
        where: { userRowId },
        data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
      }),
      // A password change logs out every other device.
      this.prisma.session.deleteMany({ where: { userRowId } }),
    ]);
  }
}
