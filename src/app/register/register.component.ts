import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators,ReactiveFormsModule  } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import { HttpClientModule  } from '@angular/common/http';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    HttpClientModule,
    RouterModule
  ]
})
export class RegisterComponent {
  registerForm: FormGroup;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      const { username, password } = this.registerForm.value;
      this.authService.register(username, password).subscribe(
        () => {
          this.router.navigate(['/login']);
        },
        error => {
          this.errorMessage = 'Registration failed. Username may already be taken.';
        }
      );
    }
  }
}
