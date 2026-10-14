import { Body, Controller, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/session.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('me')
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateUserDto) {
    return this.users.updateProfile(user.rowId, dto);
  }
}
