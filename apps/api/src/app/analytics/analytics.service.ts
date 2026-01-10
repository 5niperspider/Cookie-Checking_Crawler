import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../db/db.service';

export interface Cookie {
  id?: number;
  name: string;
  domain: string;
  value?: string;
  httpOnly?: boolean;
  sameSite?: boolean;
  expirationAt?: Date;
  location?: 'cookie' | 'indexDB' | 'localStorage';
}

export interface ClassifiedCookies {
  firstparty: {
    nontracking: Cookie[];
    tracking: Cookie[];
  };
  thirdparty: Cookie[];
}

export interface AnalyticsResult {
  [sessionId: number]: ClassifiedCookies;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly dbService: DbService) {}

  async getAnalytics(): Promise<AnalyticsResult> {
    try {
      const sessions = await this.dbService.getAllSessions();
      if (!sessions || sessions.length === 0) {
        this.logger.debug('No sessions found');
        return {};
      }

      this.logger.debug(`Processing ${sessions.length} sessions for analytics`);
      const result: AnalyticsResult = {};

      for (const session of sessions) {
        const cookies = (await this.dbService.getCookiesForSession(session.id)) || [];
        this.logger.debug(
          `Processing session ${session.id} with ${cookies.length} cookies`,
        );
        const classified = this.classifyCookies(cookies, session.url);
        result[session.id] = classified;
      }

      return result;
    } catch (error) {
      this.logger.error(`Error fetching analytics: ${error.message}`);
      return {};
    }
  }

  private classifyCookies(
    cookies: Cookie[],
    sessionUrl: string,
  ): ClassifiedCookies {
    const result: ClassifiedCookies = {
      firstparty: {
        nontracking: [],
        tracking: [],
      },
      thirdparty: [],
    };

    for (const cookie of cookies) {
      const isFirstParty = this.isFirstPartyCookie(cookie.domain, sessionUrl);

      if (isFirstParty) {
        const isTracking = this.isTrackingCookie(cookie);
        if (isTracking) {
          result.firstparty.tracking.push(cookie);
        } else {
          result.firstparty.nontracking.push(cookie);
        }
      } else {
        result.thirdparty.push(cookie);
      }
    }

    return result;
  }

  private isFirstPartyCookie(cookieDomain: string, sessionUrl: string): boolean {
    try {
      const url = new URL(sessionUrl);
      const mainDomain = url.hostname;
      return cookieDomain.includes(mainDomain);
    } catch {
      return false;
    }
  }

  private isTrackingCookie(cookie: Cookie): boolean {
    // Placeholder: später mit Pattern-Matching und anderen Verfahren erweitern
    const trackingPatterns = ['ga', 'uid', 'track', '_gid', '_ga'];
    const cookieName = cookie.name.toLowerCase();
    return trackingPatterns.some((pattern) => cookieName.includes(pattern));
  }
}
