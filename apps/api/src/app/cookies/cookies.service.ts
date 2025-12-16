import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class CookiesService {
  constructor(private readonly dbService: DbService) { }

  async getCookies(sessionId: number) {
    return this.dbService.getCookiesForSession(sessionId);
  }

  async getStats(sessionId: number) {
    const cookies = await this.dbService.getCookiesForSession(sessionId);

    const stats = {
      totalCookies: cookies.length,
      thirdPartyCookies: 0, // Skipped for now
      trackingCookies: 0, // Skipped for now
      firstPartyCookies: cookies.length, // Assuming all are first party for now since we skipped detection
      byDomain: {} as { [key: string]: number }
    };

    cookies.forEach(cookie => {
      const domain = cookie.domain || 'unknown';
      stats.byDomain[domain] = (stats.byDomain[domain] || 0) + 1;
    });

    return stats;
  }
}