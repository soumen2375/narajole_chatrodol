import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgOptimizedImage } from '@angular/common';
import { ContentService } from '../../services/content.service';

@Component({
  selector: 'app-impacts',
  templateUrl: './impacts.component.html',
  styleUrls: [],
  imports: [CommonModule, NgOptimizedImage],
})
export class ImpactsComponent {
  private contentService = inject(ContentService);
  siteSettings = this.contentService.siteSettings;
  headerFont = computed(() => this.siteSettings().headerFont);
  bodyFont = computed(() => this.siteSettings().bodyFont);

  testimonials = signal([
    {
      quote: 'নাড়াজোল ছাত্রদল আমার সন্তানকে বিনামূল্যে শিক্ষার সুযোগ দিয়েছে। তাদের সাহায্যে আমার সন্তান এখন উচ্চশিক্ষা লাভ করছে। আমি চিরকৃতজ্ঞ।',
      author: 'অজয় বিশ্বাস ',
      role: 'অভিভাবক',
      img: 'https://picsum.photos/100/100?random=20'
    },
    {
      quote: 'এই সংগঠনের স্বাস্থ্য শিবিরগুলি আমাদের গ্রামের মানুষের জন্য অত্যন্ত উপকারী। সময়মতো স্বাস্থ্যসেবা পেয়েছি যা অন্যথায় সম্ভব হতো না।',
      author: 'সুজয় দাশ ',
      role: 'গ্রামবাসী',
      img: 'https://picsum.photos/100/100?random=21'
    },
    {
      quote: 'আমি একজন স্বেচ্ছাসেবক হিসেবে নাড়াজোল ছাত্রদলের সাথে কাজ করতে পেরে গর্বিত। এটি আমাকে সমাজে ইতিবাচক পরিবর্তন আনতে সাহায্য করে।',
      author: 'অঙ্কিতা মন্ডল',
      role: 'সেচ্ছাসেবিকা',
      img: 'https://picsum.photos/100/100?random=22'
    }
  ]);

  successStories = signal([
    {
      title: 'আমডাংরা শিক্ষাজীবন: অন্ধকার থেকে আলো',
      summary: 'আমডাংরা, একজন দরিদ্র পরিবারের সন্তান, নাড়াজোল ছাত্রদলের শিক্ষাবৃত্তির মাধ্যমে তার প্রাথমিক ও মাধ্যমিক শিক্ষা সম্পন্ন করেছে। বর্তমানে সে একটি বিশ্ববিদ্যালয়ে কম্পিউটার সায়েন্স নিয়ে পড়ছে এবং তার পরিবারের প্রথম স্নাতক হতে চলেছে।',
      img: 'https://picsum.photos/800/600?random=23'
    },
    {
      title: 'সবুজ নাড়াজোল: একটি পরিবেশগত বিপ্লব',
      summary: 'গত পাঁচ বছরে নাড়াজোল ছাত্রদল স্থানীয় সম্প্রদায়ের সহায়তায় ১০০০ এরও বেশি গাছ রোপণ করেছে। এটি শুধু পরিবেশের উন্নতি করেনি, বরং স্থানীয় মানুষের মধ্যে পরিবেশ সচেতনতাও বৃদ্ধি করেছে।',
      img: 'https://picsum.photos/800/600?random=24'
    }
  ]);
}