import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    // Every route requires a valid session unless marked @Public().
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
