import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'ایمیل معتبر نیست.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'کلمه عبور باید حداقل ۸ کاراکتر باشد.' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'نام را وارد کنید.' })
  @MaxLength(80)
  name: string;
}
