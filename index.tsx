
import { bootstrapApplication, provideProtractorTestingSupport } from '@angular/platform-browser';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './src/app.component';
import { routes } from './src/app.routes';
import { provideHttpClient } from '@angular/common/http';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideProtractorTestingSupport(), // Optional, for e2e testing, can be removed
    provideHttpClient(), // Needed for services that make HTTP requests
    provideRouter(routes, withHashLocation()) // Use hash location strategy for Applets
  ]
}).catch(err => console.error(err));

// AI Studio always uses an `index.tsx` file for all project types.
