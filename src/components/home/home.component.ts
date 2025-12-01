import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ContentService, Post } from '../../services/content.service';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: [],
  imports: [CommonModule, RouterLink, NgOptimizedImage],
})
export class HomeComponent {
  private contentService = inject(ContentService);
  latestPosts = this.contentService.latestPosts;

  // Expose site settings for dynamic font application in template
  siteSettings = this.contentService.siteSettings;
  headerFont = computed(() => this.siteSettings().headerFont);
  bodyFont = computed(() => this.siteSettings().bodyFont);

  impactStats = [
    { value: '৫০০+', label: 'ছাত্র-ছাত্রীকে সাহায্য করা হয়েছে' },
    { value: '৫০+', label: 'স্বাস্থ্য শিবির আয়োজিত' },
    { value: '১০০০+', label: 'বৃক্ষ রোপণ করা হয়েছে' },
    { value: '২০+', label: 'বছর ধরে সেবা' }
  ];
}