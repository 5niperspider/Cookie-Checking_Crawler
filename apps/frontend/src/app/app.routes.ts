import { Route } from '@angular/router';
import { AnalyticsDashboardComponent } from './pages/analytics-dashboard.component';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    component: AnalyticsDashboardComponent,
  },
];
