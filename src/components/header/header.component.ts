import { Component, EventEmitter, Input, Output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ContentService } from '../../services/content.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: [],
  imports: [CommonModule, RouterLink, RouterLinkActive],
})
export class HeaderComponent {
  @Input() isMenuOpen: boolean = false;
  @Output() menuToggle = new EventEmitter<void>();

  private contentService = inject(ContentService);
  siteSettings = this.contentService.siteSettings;
  headerFont = computed(() => this.siteSettings().headerFont);

  onMenuToggle(): void {
    this.menuToggle.emit();
  }
}