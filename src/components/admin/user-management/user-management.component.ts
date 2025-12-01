import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentService, User } from '../../../services/content.service';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: [],
  imports: [CommonModule, FormsModule],
})
export class UserManagementComponent {
  private contentService = inject(ContentService);
  users = this.contentService.users; // Signal for users

  newUser: Omit<User, 'id'> = { name: '', email: '', role: 'editor' };
  roles = ['admin', 'editor'];

  addUser(): void {
    if (this.newUser.name && this.newUser.email) {
      const newUserData: User = { ...this.newUser, id: `user-${Date.now()}` } as User;
      this.contentService.addUser(newUserData);
      this.newUser = { name: '', email: '', role: 'editor' }; // Reset form
    } else {
      alert('অনুগ্রহ করে নাম এবং ইমেল উভয়ই পূরণ করুন।');
    }
  }

  updateUserRole(userId: string, event: Event): void {
    const newRole = (event.target as HTMLSelectElement).value as 'admin' | 'editor';
    this.contentService.updateUserRole(userId, newRole);
  }

  deleteUser(id: string): void {
    if (confirm('আপনি কি নিশ্চিত যে আপনি এই ব্যবহারকারীকে মুছে ফেলতে চান?')) {
      this.contentService.deleteUser(id);
    }
  }
}
