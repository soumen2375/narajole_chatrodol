import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ContentService, Post } from '../../../services/content.service';

@Component({
  selector: 'app-post-list',
  templateUrl: './post-list.component.html',
  styleUrls: [],
  imports: [CommonModule, RouterLink],
})
export class PostListComponent {
  private contentService = inject(ContentService);
  posts = this.contentService.posts; // Use signal directly

  deletePost(id: string): void {
    if (confirm('আপনি কি নিশ্চিত যে আপনি এই পোস্টটি মুছে ফেলতে চান?')) {
      this.contentService.deletePost(id);
    }
  }
}
