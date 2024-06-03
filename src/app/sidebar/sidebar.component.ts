import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SideBarComponent {
  isHidden = true;

  showSidebar() {
    this.isHidden = false;
  }

  hideSidebar() {
    this.isHidden = true;
  }
}