import { Module } from '@nestjs/common';
import { CookiesModule } from './cookies/cookies.module';
import { SessionsModul } from './sessions/sessions.module';
import { AppService } from './app.service';
import { DbService } from './db.service';
import { DbController } from './db.controller';

@Module({
  imports: [CookiesModule, SessionsModul],
  controllers: [DbController],
  providers: [AppService, DbService],
})
export class AppModule {}
