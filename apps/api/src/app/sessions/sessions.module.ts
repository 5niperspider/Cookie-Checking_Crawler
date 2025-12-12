import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { DbService } from '../db/db.service';

@Module({
  imports: [],
  controllers: [SessionsController],
  providers: [SessionsService, DbService],
})
export class SessionsModul {}