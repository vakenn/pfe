import { Component , OnInit } from '@angular/core';
import { SidebarComponent } from './sidebar/sidebar.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common'; 
import { NgModule } from '@angular/core';
import { TablesComponent } from './tables/tables.component';
import { AuthService } from './auth.service';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [
    SidebarComponent,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
    CommonModule
  ]
})
export class AppComponent implements OnInit {
  users: any[] = [];
  title = "dashboarding";
  isSidebarVisible = false;
  registerForm: FormGroup;

  constructor(private authService: AuthService,private fb: FormBuilder) {
    this.registerForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
   }
  
  ngOnInit(): void {
    this.authService.getUsers().subscribe(data => {
      this.users = data;
      console.log(this.users);
    });
  }

  toggleSidebar() {
    this.isSidebarVisible = !this.isSidebarVisible;
  }
}
