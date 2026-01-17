import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../db/db.service';
import * as fs from 'fs';
import * as path from 'path';

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
  private readonly trackingPatterns: string[];

  constructor(private readonly dbService: DbService) {
    this.trackingPatterns = this.loadTrackingPatterns();
  }

  private loadTrackingPatterns(): string[] {
    try {
      // Versuche mehrere mögliche Pfade, da __dirname je nach Laufzeitumgebung variiert
      const possiblePaths = [
        path.join(__dirname, 'analytics', 'patter.csv'),
        path.join(__dirname, '..', 'analytics', 'patter.csv'),
        path.join(process.cwd(), 'dist', 'apps', 'api', 'app', 'analytics', 'patter.csv'),
        path.join(process.cwd(), 'apps', 'api', 'src', 'app', 'analytics', 'patter.csv'),
      ];

      let filePath = '';
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          filePath = p;
          break;
        }
      }

      if (!filePath) {
        throw new Error(`patter.csv not found in any of: ${possiblePaths.join(', ')}`);
      }

      const data = fs.readFileSync(filePath, 'utf-8');
      const lines = data.split('\n').filter(line => line.trim());
      return lines.map(line => line.split(',')[0].trim()).filter(pattern => pattern);
    } catch (error) {
      this.logger.error(`Error loading tracking patterns: ${error.message}`);
      return ['ga', 'uid', 'track', '_gid', '_ga']; // fallback
    }
  }

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
    const cookieName = cookie.name.toLowerCase();
    return this.trackingPatterns.some((pattern) => cookieName.includes(pattern.toLowerCase()));
  }
}
