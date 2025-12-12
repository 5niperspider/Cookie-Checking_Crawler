import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { CrawlerService } from './crawler.service';
import { url } from 'inspector';
import { rawListeners } from 'process';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService , private readonly crawlerService: CrawlerService) {}

  @Get()
  getData() {
    return {message:"test"}
  }

  @Post()
  async create(@Body() message:{URL:string}) {
    return this.crawlerService.crawler(message.URL , 1);
}
}
