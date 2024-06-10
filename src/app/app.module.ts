import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { CommonModule } from '@angular/common';

import { HomeComponent } from './home/home.component';
import { TablesComponent } from './tables/tables.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { IndexedDBService } from './indexed-db.service';
import { routes } from './app.routes';

@NgModule({
    declarations: [
      DashboardComponent
    ],
    imports: [
      BrowserModule,
      RouterModule.forRoot(routes),
      HttpClientModule,
      FormsModule,
      TablesComponent,
      CommonModule,
      AnalyticsComponent
    ],
    providers: [IndexedDBService]
  })
  export class AppModule { }
  