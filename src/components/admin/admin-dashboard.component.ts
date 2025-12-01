import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: [],
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
})
export class AdminDashboardComponent {
  // Placeholder for authentication status or user roles
  isAdmin = true;
}
