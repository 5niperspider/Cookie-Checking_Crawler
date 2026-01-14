import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { SchedulerService } from '../scheduler/scheduler.service';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly dbService: DbService,
    private readonly schedulerService: SchedulerService,
  ) { }

  @Post()
  async create(@Body() sessionTasks: string[]) {
    try {
      if (!Array.isArray(sessionTasks) || sessionTasks.length === 0) {
        throw new Error('Invalid input: expected a non-empty array of session tasks');
      }
      return this.schedulerService.addTasks(sessionTasks);
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
    return this.dbService.getAllSessions();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.dbService.getSessionById(id);
  }

  @Get('by-config/:configId')
  getSessionIdsForConfig(@Param('configId') configId: string) {
    return this.dbService.getSessionIdsForConfig(Number(configId));
  }

  @Get('/config/:id')
  getConfigbyId(@Param('id') id: number) {
    return this.dbService.getConfigById(id);
  }
}
