import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgOptimizedImage } from '@angular/common';
import { ContentService } from '../../services/content.service';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe'; // Ensure SafeUrlPipe is imported

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.component.html',
  styleUrls: [],
  imports: [CommonModule, NgOptimizedImage, SafeUrlPipe], // Add SafeUrlPipe to imports
})
export class GalleryComponent {
  private contentService = inject(ContentService);

  siteSettings = this.contentService.siteSettings;
  headerFont = computed(() => this.siteSettings().headerFont);
  bodyFont = computed(() => this.siteSettings().bodyFont);

  images = signal([
    { src: 'https://picsum.photos/800/600?random=10', alt: 'শিক্ষামূলক শিবির', category: 'শিক্ষা' },
    { src: 'https://picsum.photos/800/600?random=11', alt: 'স্বাস্থ্য শিবির', category: 'স্বাস্থ্য' },
    { src: 'https://picsum.photos/800/600?random=12', alt: 'বৃক্ষরোপণ অভিযান', category: 'পরিবেশ' },
    { src: 'https://picsum.photos/800/600?random=13', alt: 'সাধারণ সভা', category: 'কার্যক্রম' },
    { src: 'https://picsum.photos/800/600?random=14', alt: 'বই বিতরণ', category: 'শিক্ষা' },
    { src: 'https://picsum.photos/800/600?random=15', alt: 'গ্রাম পরিষ্কার অভিযান', category: 'পরিবেশ' },
  ]);

  videos = signal([
    { src: 'https://www.youtube.com/embed/', title: 'আমাদের কার্যক্রমের ঝলক' }, // Rick Astley
    { src: 'https://www.youtube.com/embed/', title: 'ছাত্রদলের স্বেচ্ছাসেবকদের কাজ' } // Short generic video
  ]);

  selectedCategory = signal('All');

  get filteredImages() {
    if (this.selectedCategory() === 'All') {
      return this.images();
    }
    return this.images().filter(img => img.category === this.selectedCategory());
  }

  setCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  // Get unique categories for filters
  get categories(): string[] {
    const allCategories = this.images().map(img => img.category);
    // Fix: Explicitly type Array.from to ensure the elements are strings.
    return ['All', ...Array.from<string>(new Set(allCategories))];
  }
}