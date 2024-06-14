import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import { User } from '../models/user.model'; // Import the User model




function wait(seconds: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, seconds * 500); 
  });
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule
  ]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';
  users: User[] = [];

  ngOnInit(): void {
    this.authService.getUsers().subscribe(data => {
      this.users = data;
    });
    wait(1).then(() => {
      this.authService.getUsers().subscribe(data => {
        this.users = data;
      });
      console.log('Users in LoginComponent:', this.users);
      
    });
  }

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const { username, password } = this.loginForm.value;
      if (this.authService.login(username, password)) {
        this.router.navigate(['/analytics']);
      } else {
        this.errorMessage = 'Invalid username or password';
      }
    }
  }
}
