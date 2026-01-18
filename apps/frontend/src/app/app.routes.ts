import { Route } from '@angular/router';
import { AnalyticsDashboardComponent } from './components/analytics-dashboard.component';

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
