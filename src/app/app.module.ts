import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { IndexedDBService } from './indexed-db.service';
import { routes } from './app.routes';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field'; // Import MatFormFieldModule
import { MatInputModule } from '@angular/material/input'; // Import MatInputModule
import { MatTableModule } from '@angular/material/table'; // Import MatTableModule
import { MatButtonModule } from '@angular/material/button'; // Optional: If you are using buttons

@NgModule({
  imports: [
    DashboardComponent,
    LoginComponent,
    RegisterComponent,
    AppComponent,
    BrowserModule,
    RouterModule.forRoot(routes),
    FormsModule,
    ReactiveFormsModule,
    MatPaginatorModule,
    MatFormFieldModule, // Add this
    MatInputModule, // Add this
    MatTableModule, // Add this
    MatButtonModule, // Optional: If you are using buttons
    CommonModule,
    AnalyticsComponent
  ],
  providers: [
    IndexedDBService,
    provideHttpClient(withFetch())
  ]
})
export class AppModule { }
