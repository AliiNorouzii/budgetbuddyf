import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'کلمه عبور جدید باید حداقل ۸ کاراکتر باشد.' })
  newPassword: string;
}
