import { Module } from '@nestjs/common';
import { CookiesModule } from './cookies/cookies.module';
import { SessionsModul } from './sessions/sessions.module';
import { DbService } from './db/db.service';

@Module({
  imports: [CookiesModule, SessionsModul],
  controllers: [],
  providers: [DbService],
})
export class AppModule {}
