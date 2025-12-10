import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbService } from './db.service';
import { DbController } from './db.controller';
import { CrawlerService } from './crawler.service';

@Module({
  imports: [],
  controllers: [AppController, DbController],
  providers: [AppService, DbService, CrawlerService],
})
export class AppModule {}
