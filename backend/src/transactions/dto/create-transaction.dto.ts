import { TransactionType } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { IsRandId } from '../../common/dto';

export class CreateTransactionDto {
  @IsEnum(TransactionType, { message: 'نوع تراکنش نامعتبر است.' })
  type: TransactionType;

  /** Toman, positive integer. */
  @IsInt({ message: 'مبلغ باید عدد صحیح باشد.' })
  @Min(1, { message: 'مبلغ باید بیشتر از صفر باشد.' })
  @Max(1_000_000_000_000)
  amount: number;

  @IsRandId()
  accountId: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsRandId()
  categoryId?: string | null;

  @IsOptional()
  @IsDateString({}, { message: 'تاریخ نامعتبر است.' })
  transactionDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
