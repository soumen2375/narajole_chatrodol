import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { PostListComponent } from './post-list/post-list.component';
import { PostFormComponent } from './post-form/post-form.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { SettingsComponent } from './settings/settings.component';
// import { AuthGuard } from '../../services/auth.guard'; // Not implemented for this example

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminDashboardComponent,
    // canActivate: [AuthGuard], // Uncomment and implement if actual auth is needed
    children: [
      { path: '', redirectTo: 'posts', pathMatch: 'full' },
      { path: 'posts', component: PostListComponent, title: 'Admin - পোস্ট' },
      { path: 'posts/new', component: PostFormComponent, title: 'Admin - নতুন পোস্ট' },
      { path: 'posts/edit/:id', component: PostFormComponent, title: 'Admin - পোস্ট সম্পাদনা' },
      { path: 'users', component: UserManagementComponent, title: 'Admin - ব্যবহারকারী' },
      { path: 'settings', component: SettingsComponent, title: 'Admin - সেটিংস' },
    ]
  }
];
