import { Controller, Get } from '@nestjs/common';
import { AnalyticsService, AnalyticsResult } from './analytics.service';

// Defines a controller responsible for handling routes under the 'analytics' path
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // Handles GET requests to '/analytics'
  @Get()
  async getAnalytics(): Promise<AnalyticsResult> {
    return this.analyticsService.getAnalytics();
  }
}