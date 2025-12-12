import { Module } from '@nestjs/common';
import { CookiesController } from './cookies.controller';
import { CookiesService } from './cookies.service';
import { DbService } from '../db/db.service';

@Module({
  controllers: [CookiesController],
  providers: [CookiesService, DbService],
})
export class CookiesModule {}
