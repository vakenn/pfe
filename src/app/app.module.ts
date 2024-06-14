import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms'; 

import { CommonModule } from '@angular/common';

import { HomeComponent } from './home/home.component';
import { AppComponent } from './app.component';
import { TablesComponent } from './tables/tables.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { IndexedDBService } from './indexed-db.service';
import { routes } from './app.routes';

@NgModule({
    declarations: [
      HomeComponent,
      DashboardComponent,
    ],
    imports: [
      LoginComponent,
      RegisterComponent,
      AppComponent,
      BrowserModule,
      RouterModule.forRoot(routes),
      FormsModule,
      ReactiveFormsModule,
      TablesComponent,
      CommonModule,
      AnalyticsComponent
    ],
    providers: [IndexedDBService,provideHttpClient(withFetch())   ]
  })
  export class AppModule { }
  