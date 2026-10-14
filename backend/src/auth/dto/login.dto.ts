import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'ایمیل معتبر نیست.' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'کلمه عبور را وارد کنید.' })
  password: string;
}
