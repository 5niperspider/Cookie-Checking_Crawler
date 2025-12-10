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

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly db: DbService,
  ) { }

  @Post()
  async create(@Body() createSessionDto: CreateSessionDto) {
    try {
      return this.sessionsService.create(createSessionDto);
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
    return this.db.getSessionIdsForConfig(Number(configId));
  }
}
