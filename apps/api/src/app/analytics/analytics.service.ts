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
  [sessionId: string]: ClassifiedCookies;
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
      // Versuch das patter.csv file aus verschiedenen möglichen Pfaden zu laden
      const possiblePaths = [
        path.join(__dirname, 'analytics', 'patter.csv'),
        path.join(__dirname, '..', 'analytics', 'patter.csv'),
        path.join(process.cwd(), 'dist', 'apps', 'api', 'app', 'analytics', 'patter.csv'),
        path.join(process.cwd(), 'apps', 'api', 'src', 'app', 'analytics', 'patter.csv'),
      ];

      // Finde den ersten existierenden Pfad
      let filePath = '';
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          filePath = p;
          break;
        }
      }

      // Wenn keine Datei gefunden wurde, Fehler werfen
      if (!filePath) {
        throw new Error(`patter.csv not found in any of: ${possiblePaths.join(', ')}`);
      }

      // Lese die Datei und extrahiere die Muster
      const data = fs.readFileSync(filePath, 'utf-8');
      const lines = data.split('\n').filter(line => line.trim());
      return lines.map(line => line.split(',')[0].trim()).filter(pattern => pattern);
    } catch (error) {
      this.logger.error(`Error loading tracking patterns: ${error.message}`);
      return ['ga', 'uid', 'track', '_gid', '_ga']; // fallback
    }
  }

  // Hauptmethode zur Analyse der Cookies
  async getAnalytics(): Promise<AnalyticsResult> {
    try {
      // Hole alle Sitzungen aus der Datenbank
      const sessions = await this.dbService.getAllSessions();
      if (!sessions || sessions.length === 0) {
        this.logger.debug('No sessions found');
        return {};
      }

      // Verarbeite jede Sitzung
      this.logger.debug(`Processing ${sessions.length} sessions for analytics`);
      const result: AnalyticsResult = {};

      // Für jede Sitzung die Cookies abrufen und klassifizieren
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
      // Logge den Fehler und gib ein leeres Ergebnis zurück
      this.logger.error(`Error fetching analytics: ${error.message}`);
      return {};
    }
  }

  // Hilfsmethode zur Klassifizierung der Cookies
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

    // Iteriere über alle Cookies und klassifiziere sie
    for (const cookie of cookies) {
      const isFirstParty = this.isFirstPartyCookie(cookie.domain, sessionUrl);

      //  Klassifiziere basierend auf First-Party/Third-Party und Tracking/Non-Tracking
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

  // Hilfsmethode zur Bestimmung, ob ein Cookie First-Party ist
  private isFirstPartyCookie(cookieDomain: string, sessionUrl: string): boolean {
    try {
      // Stelle sicher, dass die URL ein Schema hat
      let validUrl = sessionUrl;
      if (!sessionUrl.startsWith('http://') && !sessionUrl.startsWith('https://')) {
        validUrl = 'https://' + sessionUrl;
      }

      const url = new URL(validUrl);
      const mainDomain = url.hostname;

      // Handle edge cases
      if (!cookieDomain || !mainDomain) {
        return false;
      }

      // Normalisiere die Cookie-Domain (entferne führenden Punkt und konvertiere zu lowercase)
      const normalizedCookieDomain = cookieDomain
        .toLowerCase()
        .startsWith('.') 
        ? cookieDomain.toLowerCase().slice(1) 
        : cookieDomain.toLowerCase();

      const normalizedMainDomain = mainDomain.toLowerCase();

      // Prüfe verschiedene Fälle:

      // 1. Exakte Übereinstimmung: www.google.com === www.google.com
      if (normalizedMainDomain === normalizedCookieDomain) {
        return true;
      }

      // 2. Subdomain-Match: www.google.com endet mit .google.com
      // Dies deckt auch Fälle ab wie: mail.google.com, accounts.google.com, etc.
      if (normalizedMainDomain.endsWith('.' + normalizedCookieDomain)) {
        return true;
      }

      // 3. Parent Domain mit Punkt-Präfix: 
      // sessionUrl: www.google.com, cookieDomain: .google.com
      if (cookieDomain.startsWith('.') && normalizedMainDomain.endsWith(normalizedCookieDomain)) {
        return true;
      }

      // 4. Localhost Varianten: localhost, 127.0.0.1, ::1 (IPv6)
      if (normalizedMainDomain === normalizedCookieDomain) {
        return true;
      }

      // 5. Port-Nummern ignorieren: www.google.com:8080 sollte gleich www.google.com sein
      const mainDomainWithoutPort = normalizedMainDomain.split(':')[0];
      if (mainDomainWithoutPort === normalizedCookieDomain) {
        return true;
      }
      if (mainDomainWithoutPort.endsWith('.' + normalizedCookieDomain)) {
        return true;
      }

      // 6. IP-Adressen: Exakte Übereinstimmung mit Port
      if (mainDomain === cookieDomain || mainDomainWithoutPort === normalizedCookieDomain) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  // Hilfsmethode zur Bestimmung, ob ein Cookie ein Tracking-Cookie ist
  private isTrackingCookie(cookie: Cookie): boolean {
    const cookieName = cookie.name.toLowerCase();
    return this.trackingPatterns.some((pattern) => cookieName.includes(pattern.toLowerCase()));
  }
}
