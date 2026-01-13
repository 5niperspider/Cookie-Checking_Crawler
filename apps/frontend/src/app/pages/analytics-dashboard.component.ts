import { Component, OnInit, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CookieService, CrawlSession } from '../services/cookie.service';
import { CookieOverviewChartComponent } from '../components/cookie-overview-chart.component';
import { CookiesByDomainChartComponent } from '../components/cookies-by-domain-chart.component';
import { CookieTableComponent } from '../components/cookie-table.component';
import { SessionSummaryChartComponent } from '../components/session-summary-chart.component';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CookieOverviewChartComponent,
    CookiesByDomainChartComponent,
    CookieTableComponent,
    SessionSummaryChartComponent
  ],
  template: `
    <div class="dashboard-container">
      <app-cookies-by-domain-chart [stats]="stats"></app-cookies-by-domain-chart>
      
      <app-session-summary-chart></app-session-summary-chart>

      <div class="filters-section">
        <h2>Filters</h2>
        <div class="filter-group">
          <label for="sessionSelect">Session:</label>
          <select id="sessionSelect" [(ngModel)]="selectedSessionId" (change)="onSessionChange()">
            <option value="">-- Select a session --</option>
            <option *ngFor="let session of sessions" [value]="session.id">
              {{ session.createdAt | date:'short' }} | {{ session.url }} | {{ session.browser || 'Unknown' }} | JS: {{ session.jsEnabled ? 'Yes' : 'No' }} | Banner: {{ session.cookieBannerHandled ? 'Yes' : 'No' }}
            </option>
          </select>
        </div>
        <div class="filter-group config-filter">
          <label>Configs:</label>
          <div class="custom-dropdown" #configDropdown>
            <button class="dropdown-toggle" (click)="toggleConfigDropdown()">
              {{ getSelectedConfigLabel() }}
              <span class="arrow">▼</span>
            </button>
            <div class="dropdown-menu" *ngIf="isConfigDropdownOpen">
              <div class="dropdown-item" (click)="toggleConfig('browser')">
                <input type="checkbox" [checked]="isConfigSelected('browser')"> Browser
              </div>
              <div class="dropdown-item" (click)="toggleConfig('cookie')">
                <input type="checkbox" [checked]="isConfigSelected('cookie')"> Cookie
              </div>
              <div class="dropdown-item" (click)="toggleConfig('js')">
                <input type="checkbox" [checked]="isConfigSelected('js')"> JS
              </div>
              <div class="dropdown-item" (click)="toggleConfig('ad_blocker')">
                <input type="checkbox" [checked]="isConfigSelected('ad_blocker')"> Ad Blocker
              </div>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="stats" class="stats-section">
        <div class="stat-card">
          <h3>Total Cookies</h3>
          <p class="stat-value">{{ stats.totalCookies }}</p>
        </div>
        <div class="stat-card">
          <h3>Third-Party</h3>
          <p class="stat-value">{{ stats.thirdPartyCookies }}</p>
        </div>
        <div class="stat-card">
          <h3>Tracking Cookies</h3>
          <p class="stat-value">{{ stats.trackingCookies }}</p>
        </div>
        <div class="stat-card">
          <h3>First-Party</h3>
          <p class="stat-value">{{ stats.firstPartyCookies }}</p>
        </div>
      </div>

      <div class="charts-section">
        <div class="chart-wrapper">
          <app-cookie-overview-chart [stats]="stats"></app-cookie-overview-chart>
        </div>
      </div>

      <!-- Raw Data Table -->
      <app-cookie-table [cookies]="cookies"></app-cookie-table>
    </div>
  `,
  styles: [
    `
      .dashboard-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }

      .dashboard-header {
        text-align: center;
        margin-bottom: 40px;
        border-bottom: 2px solid #e0e0e0;
        padding-bottom: 20px;
      }

      .dashboard-header h1 {
        margin: 0 0 10px 0;
        color: #333;
      }

      .dashboard-header p {
        margin: 0;
        color: #666;
        font-size: 14px;
      }

      .filters-section {
        background: #f5f5f5;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 30px;
      }

      .filters-section h2 {
        margin-top: 0;
        margin-bottom: 15px;
        font-size: 18px;
      }

      .filter-group {
        display: flex;
        gap: 10px;
        align-items: center;
      }

      .filter-group label {
        font-weight: 500;
        min-width: 100px;
      }

      .filter-group select {
        flex: 1;
        max-width: 400px;
        padding: 8px 12px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 14px;
      }

      .config-filter {
        position: relative;
      }

      .custom-dropdown {
        position: relative;
        min-width: 200px;
      }

      .dropdown-toggle {
        width: 100%;
        padding: 8px 12px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        text-align: left;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .dropdown-menu {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        margin-top: 4px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1000;
        max-height: 200px;
        overflow-y: auto;
      }

      .dropdown-item {
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .dropdown-item:hover {
        background-color: #f5f5f5;
      }

      .stats-section {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 40px;
      }

      .stat-card {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
      }

      .stat-card h3 {
        margin: 0 0 10px 0;
        font-size: 14px;
        color: #666;
        text-transform: uppercase;
      }

      .stat-value {
        margin: 0;
        font-size: 32px;
        font-weight: bold;
        color: #36a2eb;
      }

      .charts-section {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 30px;
      }

      .chart-wrapper {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 20px;
      }
    `,
  ],
})
export class AnalyticsDashboardComponent implements OnInit {
  sessions: CrawlSession[] = [];
  selectedSessionId = '';
  selectedConfig: string[] = [];
  stats: any = null;
  cookies: any[] = [];
  loading = false;
  error: string | null = null;

  // eslint-disable-next-line @angular-eslint/prefer-inject
  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(private cookieService: CookieService) { }

  ngOnInit() {
    this.loadSessions();
  }

  loadSessions() {
    this.loading = true;
    this.cookieService.getSessions().subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.loading = false;

        // Auto-select first session if available
        if (sessions.length > 0) {
          this.selectedSessionId = sessions[0].id;
          this.onSessionChange();
        }
      },
      error: (err) => {
        console.error('Could not load sessions', err);
        this.error = 'Failed to load sessions. Please ensure backend is running.';
        this.loading = false;
      },
    });
  }

  onSessionChange() {
    if (this.selectedSessionId) {
      this.cookieService.getStats(this.selectedSessionId).subscribe({
        next: (stats) => {
          this.stats = stats;
        },
        error: (err) => {
          console.error('Error loading stats', err);
          this.error = 'Failed to load stats for the selected session.';
        },
      });

      // Load Cookies List
      this.cookieService.getCookies(this.selectedSessionId).subscribe({
        next: (cookies) => {
          this.cookies = cookies;
        },
        error: (err) => {
          console.error('Error loading cookie list', err);
        }
      });
    } else {
      this.stats = null;
      this.cookies = [];
    }
  }

  isConfigDropdownOpen = false;

  toggleConfigDropdown() {
    this.isConfigDropdownOpen = !this.isConfigDropdownOpen;
  }

  toggleConfig(value: string) {
    const index = this.selectedConfig.indexOf(value);
    if (index === -1) {
      this.selectedConfig.push(value);
    } else {
      this.selectedConfig.splice(index, 1);
    }
  }

  isConfigSelected(value: string): boolean {
    return this.selectedConfig.includes(value);
  }

  configLabels: { [key: string]: string } = {
    'browser': 'Browser',
    'cookie': 'Cookie',
    'js': 'JS',
    'ad_blocker': 'Ad Blocker'
  };

  getSelectedConfigLabel(): string {
    if (this.selectedConfig.length === 0) {
      return 'Select Configs';
    }
    return this.selectedConfig.map(c => this.configLabels[c]).join(', ');
  }

  @ViewChild('configDropdown') dropdownRef!: ElementRef;

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (this.dropdownRef && !this.dropdownRef.nativeElement.contains(event.target)) {
      this.isConfigDropdownOpen = false;
    }
  }
}
