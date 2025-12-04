import { Module } from '@nestjs/common';
import { SessionsController } from './sessions/sessions.controller';
import { SessionsService } from './sessions/sessions.service';

@Module({
  imports: [],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class AppModule {}
