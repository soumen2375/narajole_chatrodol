import { Component, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ContentService } from '../../services/content.service';

@Component({
  selector: 'app-volunteer',
  templateUrl: './volunteer.component.html',
  styleUrls: [],
  imports: [CommonModule, ReactiveFormsModule],
})
export class VolunteerComponent {
  private fb = inject(FormBuilder);
  private contentService = inject(ContentService);
  volunteerForm: FormGroup;
  currentStep = signal(1);
  isSubmitted = signal(false);

  siteSettings = this.contentService.siteSettings;
  headerFont = computed(() => this.siteSettings().headerFont);
  bodyFont = computed(() => this.siteSettings().bodyFont);

  constructor() {
    this.volunteerForm = this.fb.group({
      // Step 1: Personal Info
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[6789][0-9]{9}$')]],
      address: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required],

      // Step 2: Skills & Availability
      skills: ['', Validators.required],
      availability: ['', Validators.required],
      preferredPrograms: [[''], Validators.required], // Multi-select
      previousExperience: [''],

      // Step 3: Motivation & Agreement
      motivation: ['', Validators.required],
      agreement: [false, Validators.requiredTrue] // Checkbox must be true
    });
  }

  // Helper to get form controls for specific step
  get step1Controls() {
    return ['fullName', 'email', 'phone', 'address', 'dateOfBirth', 'gender'];
  }
  get step2Controls() {
    return ['skills', 'availability', 'preferredPrograms', 'previousExperience'];
  }
  get step3Controls() {
    return ['motivation', 'agreement'];
  }

  isStepValid(stepControls: string[]): boolean {
    let valid = true;
    for (const controlName of stepControls) {
      if (this.volunteerForm.get(controlName)?.invalid) {
        valid = false;
        break;
      }
    }
    return valid;
  }

  nextStep(): void {
    const currentStepControls = this.getCurrentStepControls();
    let currentStepValid = true;

    for (const controlName of currentStepControls) {
      const control = this.volunteerForm.get(controlName);
      if (control) {
        control.markAsTouched();
        if (control.invalid) {
          currentStepValid = false;
        }
      }
    }

    if (currentStepValid) {
      this.currentStep.update(step => step + 1);
    } else {
      alert('অনুগ্রহ করে বর্তমান ধাপের সকল তথ্য সঠিকভাবে পূরণ করুন।');
    }
  }

  prevStep(): void {
    this.currentStep.update(step => step - 1);
  }

  @ViewChild('googleForm') googleForm!: ElementRef<HTMLFormElement>;

  onSubmit(): void {
    if (this.volunteerForm.invalid) {
      this.volunteerForm.markAllAsTouched();
      alert('অনুগ্রহ করে সকল ধাপের তথ্য সঠিকভাবে পূরণ করুন।');
      return;
    }

    const formData = new FormData(this.googleForm.nativeElement);

    console.log(Object.fromEntries(formData.entries()));

    this.googleForm.nativeElement.submit();
    console.log('Volunteer Application Submitted:', this.volunteerForm.value);

    // In a real application, send this data to a backend.
    this.isSubmitted.set(true);
    this.volunteerForm.reset({
      gender: '', // Reset selects to empty
      preferredPrograms: [''], // Reset multi-select
      agreement: false // Reset checkbox
    });
    this.currentStep.set(1);
    setTimeout(() => this.isSubmitted.set(false), 8000);
  }

  private getCurrentStepControls(): string[] {
    switch (this.currentStep()) {
      case 1: return this.step1Controls;
      case 2: return this.step2Controls;
      case 3: return this.step3Controls;
      default: return [];
    }
  }

  programOptions = signal([
    { name: 'বিনামূল্যে শিক্ষাদান', value: 'Free education' },
    { name: 'স্বাস্থ্য সচেতনতা ও শিবির', value: 'Health awareness and camps' },
    { name: 'পরিবেশ সুরক্ষা', value: 'Environmental protection' },
    { name: 'নারী ও শিশু উন্নয়ন', value: 'Women and Child Development' },
    { name: 'অন্যান্য সামাজিক কর্মসূচি', value: 'Other social programs' }
  ]);

  onProgramChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedOptions = Array.from(selectElement.selectedOptions).map(option => option.value);
    this.volunteerForm.controls['preferredPrograms'].setValue(selectedOptions);
  }
}