import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ContentService } from '../../services/content.service';

@Component({
  selector: 'app-donate',
  templateUrl: './donate.component.html',
  styleUrls: [],
  imports: [CommonModule, ReactiveFormsModule],
})
export class DonateComponent {
  private fb = inject(FormBuilder);
  private contentService = inject(ContentService);
  donationForm: FormGroup;
  isSubmitted = signal(false);

  siteSettings = this.contentService.siteSettings;
  headerFont = computed(() => this.siteSettings().headerFont);
  bodyFont = computed(() => this.siteSettings().bodyFont);

  constructor() {
    this.donationForm = this.fb.group({
      amount: [500, [Validators.required, Validators.min(10)]], // Default to 500 BDT
      frequency: ['one-time', Validators.required],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      message: ['']
    });
  }

  onSubmit(): void {
    if (this.donationForm.valid) {
      console.log('Donation form submitted:', this.donationForm.value);
      // Placeholder for payment gateway integration
      // In a real app, this would redirect to a payment page or process the payment.
      this.isSubmitted.set(true);
      this.donationForm.reset({
        amount: 500,
        frequency: 'one-time',
        name: '',
        email: '',
        message: ''
      });
      setTimeout(() => this.isSubmitted.set(false), 5000);
    } else {
      this.donationForm.markAllAsTouched();
      alert('অনুগ্রহ করে দানের ফর্মের সকল তথ্য সঠিকভাবে পূরণ করুন।');
    }
  }
}