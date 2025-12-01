import { Component, inject, signal, computed, effect, WritableSignal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { ContentService, SiteSettings } from './services/content.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [],
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, HeaderComponent, FooterComponent],
})
export class AppComponent {
  private contentService = inject(ContentService);
  isMenuOpen = signal(false);

  // Explicitly type siteSettings as a WritableSignal to clarify its nature
  siteSettings: WritableSignal<SiteSettings> = this.contentService.siteSettings;

  // Make computed signals public for use in template (if needed for global styles)
  primaryColor = computed(() => this.siteSettings().primaryColor);
  secondaryColor = computed(() => this.siteSettings().secondaryColor);
  accentColor = computed(() => this.siteSettings().accentColor);
  headerFont = computed(() => this.siteSettings().headerFont);
  bodyFont = computed(() => this.siteSettings().bodyFont);

  constructor() {
    // Use an effect to react to changes in siteSettings and apply theme dynamically
    effect(() => {
      this.applyThemeToBody();
    });
  }

  toggleMenu() {
    this.isMenuOpen.update(value => !value);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
  }

  private applyThemeToBody() {
    const body = document.body;
    body.style.setProperty('--primary-color', this.primaryColor());
    body.style.setProperty('--secondary-color', this.secondaryColor());
    body.style.setProperty('--accent-color', this.accentColor());
    body.style.setProperty('--header-font', this.headerFont());
    body.style.setProperty('--body-font', this.bodyFont());

    // Removed direct classList manipulation. Components will use [style.fontFamily] bindings.
    // The initial `font-roboto` class from index.html will serve as a default.
  }
}