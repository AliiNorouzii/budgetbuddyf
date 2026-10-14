import { IsInt, Matches, Max, Min } from 'class-validator';
import { IsRandId } from '../../common/dto';

export class UpdateBudgetDto {
  @IsInt({ message: 'سقف بودجه باید عدد صحیح باشد.' })
  @Min(1, { message: 'سقف بودجه باید بیشتر از صفر باشد.' })
  @Max(1_000_000_000_000)
  limitAmount: number;
}

export class CreateBudgetDto extends UpdateBudgetDto {
  @IsRandId()
  categoryId: string;

  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'ماه باید به شکل YYYY-MM باشد.' })
  month: string;
}
