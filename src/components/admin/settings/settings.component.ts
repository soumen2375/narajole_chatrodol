import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ContentService, SiteSettings } from '../../../services/content.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: [],
  imports: [CommonModule, ReactiveFormsModule],
})
export class SettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private contentService = inject(ContentService);

  settingsForm!: FormGroup;
  currentSettings = this.contentService.siteSettings;

  fonts = signal([
    'Roboto',
    'Noto Sans Bengali',
    'Open Sans',
    'Lato',
    'Montserrat'
  ]);

  ngOnInit(): void {
    this.settingsForm = this.fb.group({
      siteName: [this.currentSettings().siteName],
      primaryColor: [this.currentSettings().primaryColor],
      secondaryColor: [this.currentSettings().secondaryColor],
      accentColor: [this.currentSettings().accentColor],
      headerFont: [this.currentSettings().headerFont],
      bodyFont: [this.currentSettings().bodyFont]
    });
  }

  onSubmit(): void {
    if (this.settingsForm.valid) {
      const updatedSettings: SiteSettings = this.settingsForm.value;
      this.contentService.updateSiteSettings(updatedSettings);
      alert('সেটিংস সফলভাবে আপডেট করা হয়েছে!');
    }
  }
}
