import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CookieService, CrawlSession } from '../services/cookie.service';
import { AnalyticsService } from '../services/analytics.service';
import { CookieOverviewChartComponent } from './cookie-overview-chart.component';
import { CookiesByDomainChartComponent } from './cookies-by-domain-chart.component';
import { SessionSummaryChartComponent } from './session-summary-chart.component';
import { TrackingSummaryChartComponent } from './tracking-summary-chart.component';
import { JsSummaryChartComponent } from './js-summary-chart.component';
import { CookieTableComponent } from './cookie-table.component';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CookieOverviewChartComponent,
    CookiesByDomainChartComponent,
    CookieTableComponent,
    SessionSummaryChartComponent,
    TrackingSummaryChartComponent,
    JsSummaryChartComponent
  ],
  template: `
    <div class="dashboard-container">
      <!-- GLOBALE Browser-Vergleiche (alle Sessions) -->
      <app-cookies-by-domain-chart [stats]="globalStats" [sessions]="sessions"></app-cookies-by-domain-chart>
      
      <div class="summary-charts-row">
        <app-session-summary-chart [sessions]="sessions"></app-session-summary-chart>
        <app-tracking-summary-chart [sessions]="sessions"></app-tracking-summary-chart>
      </div>

      <app-js-summary-chart [sessions]="sessions" [analyticsData]="analyticsData"></app-js-summary-chart>

      <!-- URL Filter -->
      <div class="filters-section">
        <h2>Filters</h2>
        <div class="filter-group">
          <label for="urlSelect">Website (URL):</label>
          <select id="urlSelect" [(ngModel)]="selectedUrl" (change)="onUrlChange()">
            <option value="">-- Alle Websites --</option>
            <option *ngFor="let url of uniqueUrls" [value]="url">
              {{ url }}
            </option>
          </select>
          <span *ngIf="selectedUrl" class="filter-info">
            {{ filteredSessions().length }} Sessions | 
            {{ urlStats()?.totalCookies || 0 }} Cookies
          </span>
        </div>
      </div>

      <!-- URL-spezifische Stats -->
      <div *ngIf="selectedUrl && urlStats()" class="stats-section">
        <div class="stat-card">
          <h3>Total Cookies</h3>
          <p class="stat-value">{{ urlStats()!.totalCookies }}</p>
        </div>
        <div class="stat-card">
          <h3>Third-Party</h3>
          <p class="stat-value">{{ urlStats()!.thirdPartyCookies }}</p>
        </div>
        <div class="stat-card">
          <h3>Tracking Cookies</h3>
          <p class="stat-value">{{ urlStats()!.trackingCookies }}</p>
        </div>
        <div class="stat-card">
          <h3>First-Party</h3>
          <p class="stat-value">{{ urlStats()!.firstPartyCookies }}</p>
        </div>
      </div>

      <!-- URL-spezifische Charts -->
      <div *ngIf="selectedUrl" class="charts-section">
        <div class="chart-wrapper">
          <app-cookie-overview-chart [stats]="urlStats()!"></app-cookie-overview-chart>
        </div>
      </div>

      <!-- URL-spezifische Cookie Table -->
      <app-cookie-table *ngIf="selectedUrl && urlCookies().length > 0" 
                       [cookies]="urlCookies()"></app-cookie-table>
    </div>
  `,
  styles: [`
    .dashboard-container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .summary-charts-row { display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 20px; }
    @media (min-width: 900px) {
        .summary-charts-row { grid-template-columns: 1fr 1fr; }
    }
    .filters-section { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .filter-group { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .filter-group label { font-weight: 500; min-width: 120px; }
    .filter-group select { flex: 1; max-width: 500px; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; }
    .filter-info { background: #e3f2fd; padding: 6px 12px; border-radius: 4px; font-weight: 500; color: #1976d2; font-size: 14px; }
    .stats-section { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
    .stat-card { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; text-align: center; }
    .stat-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; text-transform: uppercase; }
    .stat-value { margin: 0; font-size: 32px; font-weight: bold; color: #36a2eb; }
    .charts-section { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 30px; }
    .chart-wrapper { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; }
  `]
})
export class AnalyticsDashboardComponent implements OnInit {
  sessions: CrawlSession[] = [];
  selectedUrl = '';
  uniqueUrls: string[] = [];

  // Signals für URL-Daten
  filteredSessions = signal<CrawlSession[]>([]);
  urlStats = signal<any>(null);
  urlCookies = signal<any[]>([]);

  // Globale Daten
  globalStats: any = null;
  analyticsData: any = {};

  private cookieService = inject(CookieService);
  private analyticsService = inject(AnalyticsService);

  ngOnInit() {
    this.loadAllData();
  }

  private loadAllData() {
    // 1. Sessions laden
    this.cookieService.getSessions().subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.updateUniqueUrls();
      },
      error: (err) => console.error('Sessions error:', err)
    });

    // 2. AnalyticsData laden (für lokale Berechnung)
    this.analyticsService.getAnalytics().subscribe({
      next: (data) => {
        this.analyticsData = data;
        // Globale Stats berechnen
        if (this.sessions.length > 0) {
          this.globalStats = this.calculateStats(this.sessions);
        }
      },
      error: (err) => console.error('Analytics error:', err)
    });
  }

  private updateUniqueUrls() {
    this.uniqueUrls = Array.from(new Set(this.sessions.map(s => s.url))).sort();
  }

  onUrlChange() {
    if (this.selectedUrl) {
      const urlSessions = this.sessions.filter(s => s.url === this.selectedUrl);
      this.filteredSessions.set(urlSessions);

      // ← LOKAL berechnen 
      this.urlStats.set(this.calculateStats(urlSessions));
      this.urlCookies.set(this.collectUrlCookies(urlSessions));
    } else {
      this.filteredSessions.set([]);
      this.urlStats.set(null);
      this.urlCookies.set([]);
    }
  }

  // ← LOKALE Stats-Berechnung
  private calculateStats(sessions: CrawlSession[]): any {
    let total = 0, thirdParty = 0, tracking = 0, firstParty = 0;

    sessions.forEach(session => {
      const classified = this.analyticsData[String(session.id)];
      if (classified) {
        const nontracking = classified.firstparty?.nontracking?.length || 0;
        const trackingCookies = classified.firstparty?.tracking?.length || 0;
        const thirdPartyCookies = classified.thirdparty?.length || 0;

        total += nontracking + trackingCookies + thirdPartyCookies;
        firstParty += nontracking + trackingCookies;
        thirdParty += thirdPartyCookies;
        tracking += trackingCookies;
      }
    });

    return {
      totalCookies: total,
      thirdPartyCookies: thirdParty,
      trackingCookies: tracking,
      firstPartyCookies: firstParty
    };
  }

  // ← Sammle Cookies für Table
  private collectUrlCookies(sessions: CrawlSession[]): any[] {
    const allCookies: any[] = [];
    sessions.forEach(session => {
      const classified = this.analyticsData[String(session.id)];
      if (classified) {
        allCookies.push(...(classified.firstparty?.nontracking || []));
        allCookies.push(...(classified.firstparty?.tracking || []));
        allCookies.push(...(classified.thirdparty || []));
      }
    });
    return allCookies;
  }
}
