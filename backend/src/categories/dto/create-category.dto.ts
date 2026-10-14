import { IsHexColor, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'نام دسته‌بندی نمی‌تواند خالی باشد.' })
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsHexColor({ message: 'رنگ باید کد هگز باشد.' })
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;
}
