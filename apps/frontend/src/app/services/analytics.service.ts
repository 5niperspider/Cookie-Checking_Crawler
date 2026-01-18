import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Fetch analytics data - returns classified cookies by session ID
   */
  getAnalytics(): Observable<AnalyticsResult> {
    return this.http.get<AnalyticsResult>(`${this.apiUrl}/analytics`);
  }
}
