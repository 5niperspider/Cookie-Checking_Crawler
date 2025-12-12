import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { DbService } from '../db/db.service';
import { SchedulerService } from '../scheduler/scheduler.service';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly dbService: DbService,
    private readonly schedulerService: SchedulerService,
  ) { }

  @Post()
  async create(@Body() sessionTask: CreateSessionDto) {
    try {

      return this.schedulerService.addTask(sessionTask);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
        {
          cause: error,
        }
      );
    }
  }

  @Get('status/:id')
  getStatus(@Param('id') id: string) {
    return this.schedulerService.getStatus(id);
  }

  @Get()
  getSessions() {
    return this.sessionsService.getSessions();
  }

  //tbd
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sessionsService.getSessionById(id);
  }

  @Get('by-config/:configId')
  getSessionIdsForConfig(@Param('configId') configId: string) {
    return this.dbService.getSessionIdsForConfig(Number(configId));
  }
}
