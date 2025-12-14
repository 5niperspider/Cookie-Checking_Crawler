import { Module } from '@nestjs/common';
import { CookiesModule } from './cookies/cookies.module';
import { SessionsModul } from './sessions/sessions.module';
import { DbService } from './db/db.service';
import { SchedulerService } from './scheduler/scheduler.service';
import { CrawlerService } from './crawler.service';

@Module({
  imports: [CookiesModule, SessionsModul],
  controllers: [],
  providers: [DbService, SchedulerService, CrawlerService],
})
export class AppModule {}
