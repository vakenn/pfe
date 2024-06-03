import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { TablesComponent } from './tables/tables.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AnalyticsComponent } from './analytics/analytics.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'tables', component: TablesComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'analytics', component: AnalyticsComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' }
];
