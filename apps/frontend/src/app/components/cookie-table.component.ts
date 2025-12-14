import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cookie } from '../services/cookie.service';

@Component({
    selector: 'app-cookie-table',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="table-container">
      <h3>Raw Cookie Data</h3>
      <table *ngIf="cookies.length > 0; else noData">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Value</th>
            <th>Domain</th>
            <th>Path</th>
            <th>Expires</th>
            <th>Created At</th>
            <th>3rd Party</th>
            <th>Tracking</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let cookie of cookies">
            <td><small>{{ cookie.id }}</small></td>
            <td>{{ cookie.name }}</td>
            <td class="value-cell" [title]="cookie.value">{{ cookie.value }}</td>
            <td>{{ cookie.domain }}</td>
            <td>{{ cookie.path }}</td>
            <td>{{ cookie.expires || 'Session' }}</td>
            <td>{{ cookie.createdAt | date:'short' }}</td>
            <td>{{ cookie.isThirdParty ? 'Yes' : 'No' }}</td>
            <td>{{ cookie.isTracking ? 'Yes' : 'No' }}</td>
          </tr>
        </tbody>
      </table>
      <ng-template #noData>
        <p class="no-data">No cookies found for this session.</p>
      </ng-template>
    </div>
  `,
    styles: [`
    .table-container {
      margin-top: 30px;
      overflow-x: auto;
      background: white;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }
    h3 { margin-top: 0; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
    th { background-color: #f5f5f5; font-weight: 600; }
    .value-cell { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .no-data { color: #666; font-style: italic; }
  `]
})
export class CookieTableComponent {
    @Input() cookies: Cookie[] = [];
}
