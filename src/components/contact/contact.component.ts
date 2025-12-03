import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ContentService } from '../../services/content.service';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css'],
  imports: [CommonModule, ReactiveFormsModule],
})
export class ContactComponent {
  private fb = inject(FormBuilder);
  private contentService = inject(ContentService);
  contactForm: FormGroup;
  isSubmitted = signal(false);

  siteSettings = this.contentService.siteSettings;
  headerFont = computed(() => this.siteSettings().headerFont);
  bodyFont = computed(() => this.siteSettings().bodyFont);

  constructor() {
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.contactForm.valid) {
      console.log('Contact form submitted:', this.contactForm.value);
      // In a real application, you would send this data to a backend service
      this.isSubmitted.set(true);
      this.contactForm.reset();
      // Optionally reset submitted state after a few seconds
      setTimeout(() => this.isSubmitted.set(false), 5000);
    } else {
      this.contactForm.markAllAsTouched();
      alert('অনুগ্রহ করে ফর্মের সকল তথ্য সঠিকভাবে পূরণ করুন।');
    }
  }
}