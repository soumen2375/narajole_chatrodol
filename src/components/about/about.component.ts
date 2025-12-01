import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgOptimizedImage } from '@angular/common';
import { ContentService } from '../../services/content.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: [],
  imports: [CommonModule, NgOptimizedImage],
})
export class AboutComponent {
  private contentService = inject(ContentService);
  siteSettings = this.contentService.siteSettings;
  headerFont = computed(() => this.siteSettings().headerFont);
  bodyFont = computed(() => this.siteSettings().bodyFont);

  teamMembers = [
    { name: 'আহমেদ ফয়সাল', role: 'সভাপতি', img: 'https://picsum.photos/200/200?random=1' },
    { name: 'সানিয়া সুলতানা', role: 'সাধারণ সম্পাদক', img: 'https://picsum.photos/200/200?random=2' },
    { name: 'রবিউল ইসলাম', role: 'কোষাধ্যক্ষ', img: 'https://picsum.photos/200/200?random=3' },
    { name: 'নাজমা আক্তার', role: 'প্রোগ্রাম ডিরেক্টর', img: 'https://picsum.photos/200/200?random=4' }
  ];
}