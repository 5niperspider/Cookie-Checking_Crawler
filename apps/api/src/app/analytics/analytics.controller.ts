import { Controller, Get } from '@nestjs/common';
import { AnalyticsService, AnalyticsResult } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  async getAnalytics(): Promise<AnalyticsResult> {
    return this.analyticsService.getAnalytics();
  }
}
