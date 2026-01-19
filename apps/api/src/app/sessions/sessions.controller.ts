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

// Controller to manage session-related endpoints
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly dbService: DbService,
    private readonly schedulerService: SchedulerService,
  ) { }

  // Endpoint to create new session tasks
  @Post()
  async create(@Body() sessionTasks: string[]) {
    try {
      // Validate input
      if (!Array.isArray(sessionTasks) || sessionTasks.length === 0) {
        throw new Error('Invalid input: expected a non-empty array of session tasks');
      }
      return this.schedulerService.addTasks(sessionTasks);
    } catch (error) {
      // Handle errors and return appropriate HTTP response
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

  // Endpoint to get the status of a specific session
  @Get('status/:id')
  getStatus(@Param('id') id: string) {
    return this.schedulerService.getStatus(id);
  }

  // Endpoint to retrieve all sessions
  @Get()
  getSessions() {
    return this.dbService.getAllSessions();
  }

  // Endpoint to retrieve a specific session by ID
  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.dbService.getSessionById(id);
  }

  // Endpoint to get session IDs associated with a specific configuration
  @Get('by-config/:configId')
  getSessionIdsForConfig(@Param('configId') configId: string) {
    return this.dbService.getSessionIdsForConfig(Number(configId));
  }

  // Endpoint to retrieve configuration by ID
  @Get('/config/:id')
  getConfigbyId(@Param('id') id: number) {
    return this.dbService.getConfigById(id);
  }
}
