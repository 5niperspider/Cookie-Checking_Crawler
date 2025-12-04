import { Module } from '@nestjs/common';
import { CookiesModule } from './cookies/cookies.module';
import { SessionsModul } from './sessions/sessions.module';

@Module({
  imports: [CookiesModule, SessionsModul],
})
export class AppModule {}
