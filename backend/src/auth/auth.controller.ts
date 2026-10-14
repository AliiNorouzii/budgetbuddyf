import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser, Public } from './decorators';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { clearSessionCookie, clientInfo, readSessionCookie, setSessionCookie } from './session-cookie';
import { SessionService } from './session.service';
import type { AuthUser } from './session.service';

const toPublicUser = (u: { randId: string; name: string; email: string }) => ({
  id: u.randId,
  name: u.name,
  email: u.email,
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.register(dto);
    setSessionCookie(res, await this.sessions.create(user.rowId, clientInfo(req)));
    return { user: toPublicUser(user) };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.verifyCredentials(dto);

    // Replace any session this browser already had, and clean up dead ones.
    await this.sessions.revoke(readSessionCookie(req));
    await this.sessions.purgeExpired(user.rowId);

    const session = await this.sessions.create(user.rowId, clientInfo(req));
    setSessionCookie(res, session);
    return { user: toPublicUser(user), expiresAt: session.expiresAt };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.sessions.revoke(readSessionCookie(req));
    clearSessionCookie(res);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return { user: { id: user.id, name: user.name, email: user.email } };
  }

  @Post('change-password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.changePassword(user.rowId, dto.currentPassword, dto.newPassword);
    setSessionCookie(res, await this.sessions.create(user.rowId, clientInfo(req)));
  }
}
