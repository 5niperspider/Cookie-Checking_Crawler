import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { DbService } from '../db/db.service';
import { SchedulerService } from '../scheduler/scheduler.service';

@Module({
  imports: [],
  controllers: [SessionsController],
  providers: [SessionsService, DbService, SchedulerService],
})
export class SessionsModul {}