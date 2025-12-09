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
    { name: 'স্বরূপ সামন্ত', role: 'সভাপতি', img: 'src/assets/images/members/swarup.jpg' },
    { name: 'শুভদীপ ঘোড়াই', role: 'সহ-সভাপতি', img: 'src/assets/images/members/subhadip.jpg' },
    { name: 'সায়ন সামন্ত', role: 'সাধারণ সম্পাদক', img: 'src/assets/images/members/sayan.jpg' },
    { name: 'সুরজিৎ বেরা', role: 'যুগ্ম সম্পাদক', img: 'src/assets/images/members/surajit.jpg' },
    { name: 'শুভজিৎ কুন্ডু', role: 'কোষাধ্যক্ষ', img: 'src/assets/images/members/subhajit.jpg' },
    { name: 'পবিত্র সাঁতরা', role: 'সহ-কোষাধ্যক্ষ', img: 'src/assets/images/members/pabitra.jpg' },
    { name: 'সৌমেন  মাইতি', role: 'ডিজিটাল অপারেশনস ও কমপ্লায়েন্স সম্পাদক', img: 'src/assets/images/members/soumen.jpg' },
    { name: 'প্রবাল ভুঁইয়া', role: 'এক্সেকিউশন ও রিসোর্স ম্যানেজার', img: 'src/assets/images/members/prabal.jpg' }
  ];
}