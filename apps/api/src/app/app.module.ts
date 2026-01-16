import { Module } from '@nestjs/common';
import { CookiesModule } from './cookies/cookies.module';
import { SessionsModule } from './sessions/sessions.module';
import { DbService } from './db/db.service';
import { SchedulerService } from './scheduler/scheduler.service';
import { CrawlerService } from './crawler.service';
import { AnalyticsService } from './analytics/analytics.service';
import { AnalyticsController } from './analytics/analytics.controller';

@Module({
  imports: [CookiesModule, SessionsModule],
  controllers: [AnalyticsController],
  providers: [DbService, SchedulerService, CrawlerService, AnalyticsService],
})
export class AppModule {}
