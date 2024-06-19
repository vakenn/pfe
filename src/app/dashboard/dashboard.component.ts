import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  constructor(private router: Router) {}


  async ngOnInit(): Promise<void> {

    const username: string | null = sessionStorage.getItem('user');
    if (username !== null) {
      console.log(`Username is ${username}`);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
