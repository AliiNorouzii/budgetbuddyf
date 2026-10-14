import { AccountType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'نام حساب را وارد کنید.' })
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsEnum(AccountType, { message: 'نوع حساب نامعتبر است.' })
  type?: AccountType;
}
