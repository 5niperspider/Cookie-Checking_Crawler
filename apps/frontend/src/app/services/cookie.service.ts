import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

export interface Cookie {
  id: string;
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: string;
  isThirdParty: boolean;
  isTracking: boolean;
  sessionId: string;
  createdAt: string;
}

export interface CookieStats {
  totalCookies: number;
  thirdPartyCookies: number;
  trackingCookies: number;
  firstPartyCookies: number;
  byDomain: { [key: string]: number };
  byBrowser?: { [key: string]: number };
}

export interface CrawlSession {
  id: string;
  browser: string;
  jsEnabled: boolean;
  cookieBannerHandled: boolean;
  adBlockerEnabled: boolean;
  createdAt: string;
  cookies?: Cookie[];
}

@Injectable({
  providedIn: 'root',
})
export class CookieService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  /**
   * Fetch all crawl sessions
   */
  getSessions(): Observable<CrawlSession[]> {
    return this.http.get<CrawlSession[]>(`${this.apiUrl}/sessions`);
  }

  /**
   * Fetch a specific session by ID
   */
  getSession(id: string): Observable<CrawlSession> {
    return this.http.get<CrawlSession>(`${this.apiUrl}/sessions/${id}`);
  }

  /**
   * Fetch cookies for a session with optional filters
   */
  getCookies(
    sessionId: string,
    filters?: { isThirdParty?: boolean; isTracking?: boolean }
  ): Observable<Cookie[]> {
    let url = `${this.apiUrl}/sessions/${sessionId}/cookies`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.isThirdParty !== undefined) {
        params.append('isThirdParty', String(filters.isThirdParty));
      }
      if (filters.isTracking !== undefined) {
        params.append('isTracking', String(filters.isTracking));
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }
    return this.http.get<Cookie[]>(url);
  }

  /**
   * Get aggregated cookie statistics
   */
  /**
   * Get aggregated cookie statistics
   */
  getStats(sessionId: string): Observable<CookieStats> {
    return this.http.get<CookieStats>(`${this.apiUrl}/cookies/stats/${sessionId}`);
  }
}
