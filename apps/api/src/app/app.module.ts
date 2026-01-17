import { Module } from '@nestjs/common';
import { CookiesModule } from './cookies/cookies.module';
import { DbService } from './db/db.service';
import { SchedulerService } from './scheduler/scheduler.service';
import { CrawlerService } from './crawler.service';
import { AnalyticsService } from './analytics/analytics.service';
import { AnalyticsController } from './analytics/analytics.controller';
import { SessionsModul } from './sessions/sessions.module';
import { CrawlerConfigService } from './crawler.config';

@Module({
  imports: [CookiesModule, SessionsModul],
  controllers: [AnalyticsController],
  providers: [DbService, SchedulerService, CrawlerService, AnalyticsService, CrawlerConfigService],
})
export class AppModule {}
