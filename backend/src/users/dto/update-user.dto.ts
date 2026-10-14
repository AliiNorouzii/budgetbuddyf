import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'نام را وارد کنید.' })
  @MaxLength(80)
  name: string;
}
