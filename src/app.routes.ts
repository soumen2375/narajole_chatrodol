import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { AboutComponent } from './components/about/about.component';
import { ProgramsComponent } from './components/programs/programs.component';
import { EventsComponent } from './components/events/events.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { ImpactsComponent } from './components/impacts/impacts.component';
import { ContactComponent } from './components/contact/contact.component';
import { VolunteerComponent } from './components/volunteer/volunteer.component';
import { DonateComponent } from './components/donate/donate.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'নাড়াজোল ছাত্রদল - হোম' },
  { path: 'about', component: AboutComponent, title: 'নাড়াজোল ছাত্রদল - আমাদের কথা' },
  { path: 'programs', component: ProgramsComponent, title: 'নাড়াজোল ছাত্রদল - কর্মসূচি' },
  { path: 'events', component: EventsComponent, title: 'নাড়াজোল ছাত্রদল - অনুষ্ঠান' },
  { path: 'gallery', component: GalleryComponent, title: 'নাড়াজোল ছাত্রদল - চিত্রশালা' },
  { path: 'impacts', component: ImpactsComponent, title: 'নাড়াজোল ছাত্রদল - প্রভাব' },
  { path: 'contact', component: ContactComponent, title: 'নাড়াজোল ছাত্রদল - যোগাযোগ' },
  { path: 'volunteer', component: VolunteerComponent, title: 'নাড়াজোল ছাত্রদল - স্বেচ্ছাসেবক হোন' },
  { path: 'donate', component: DonateComponent, title: 'নাড়াজোল ছাত্রদল - অনুদান' },
  { path: '**', redirectTo: '' } // Redirect to home for any unknown routes
];
