import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentService, Post } from '../../services/content.service';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: [],
  imports: [CommonModule],
})
export class EventsComponent {
  private contentService = inject(ContentService);
  events = this.contentService.posts; // All posts, will filter by category

  siteSettings = this.contentService.siteSettings;
  headerFont = computed(() => this.siteSettings().headerFont);
  bodyFont = computed(() => this.siteSettings().bodyFont);

  upcomingEvents = this.contentService.getPostsByCategory('Events').filter(event => new Date(event.publishedDate) >= new Date());
  pastEvents = this.contentService.getPostsByCategory('Events').filter(event => new Date(event.publishedDate) < new Date());

  constructor() {
    // Sort events by date
    this.upcomingEvents.sort((a, b) => new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime());
    this.pastEvents.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
  }
}