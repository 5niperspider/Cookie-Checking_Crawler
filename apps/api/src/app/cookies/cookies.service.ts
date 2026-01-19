import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

// Service to manage cookies associated with user sessions
@Injectable()
export class CookiesService {
  constructor(private readonly dbService: DbService) { }

  // Retrieve cookies for a specific session
  async getCookies(sessionId: number) {
    return this.dbService.getCookiesForSession(sessionId);
  }

  // Get statistics about cookies for a specific session
  async getStats(sessionId: number) {
    const cookies = await this.dbService.getCookiesForSession(sessionId);

    // Placeholder for cookie classification logic
    const stats = {
      totalCookies: cookies.length,
      thirdPartyCookies: 0, // Skipped for now
      trackingCookies: 0, // Skipped for now
      firstPartyCookies: cookies.length, // Assuming all are first party for now since we skipped detection
      byDomain: {} as { [key: string]: number }
    };

    // Aggregate cookies by domain
    cookies.forEach(cookie => {
      const domain = cookie.domain || 'unknown';
      stats.byDomain[domain] = (stats.byDomain[domain] || 0) + 1;
    });

    return stats;
  }
}