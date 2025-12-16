import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { DbService } from '../db/db.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { CrawlerService } from '../crawler.service';

@Module({
  imports: [],
  controllers: [SessionsController],
  providers: [DbService, SchedulerService, CrawlerService],
})
export class SessionsModul {}