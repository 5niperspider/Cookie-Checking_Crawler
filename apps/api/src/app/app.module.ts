import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbService } from './db.service';
import { DbController } from './db.controller';

@Module({
  imports: [],
  controllers: [AppController, DbController],
  providers: [AppService, DbService],
})
export class AppModule {}
