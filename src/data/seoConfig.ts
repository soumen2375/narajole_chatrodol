/**
 * seoConfig.ts
 *
 * Centralized SEO metadata for every public route.
 * Used by individual pages when calling the `useSEO` hook.
 */

import type { SEOProps } from '@/hooks/useSEO';

const BRAND = 'Chhatradol Social Welfare Organisation';

export const SEO: Record<string, SEOProps> = {
  '/': {
    title: `${BRAND} | Serving Communities with Compassion`,
    description:
      'Discover the social welfare initiatives of Chhatradol Social Welfare Organisation, including blood donation, health camps, education and community support in West Bengal.',
    ogType: 'website',
  },

  '/about': {
    title: `About ${BRAND} | Our Mission & Impact`,
    description:
      'Learn about Chhatradol Social Welfare Organisation — our mission, vision, leadership and 7+ years of community service in education, health and social welfare in West Bengal.',
  },

  '/programs': {
    title: `Our Programs & Initiatives | ${BRAND}`,
    description:
      'Explore the community welfare programs run by Chhatradol, including education support, health camps, blood donation, environmental initiatives and social awareness in West Bengal.',
  },

  '/events': {
    title: `Social Welfare Events & Campaigns | ${BRAND}`,
    description:
      'Browse upcoming and past social welfare events, blood donation camps, health check-up camps, and community programs organised by Chhatradol Social Welfare Organisation.',
  },

  '/gallery': {
    title: `Social Welfare Photo Gallery | ${BRAND}`,
    description:
      'View photos and highlights from blood donation camps, health camps, educational initiatives and community welfare activities by Chhatradol Social Welfare Organisation.',
  },

  '/impacts': {
    title: `Our Impact & Achievements | ${BRAND}`,
    description:
      'See the measurable impact of Chhatradol Social Welfare Organisation — students supported, health camps held, trees planted and communities served across West Bengal.',
  },

  '/contact': {
    title: `Contact ${BRAND} | Get in Touch`,
    description:
      'Reach out to Chhatradol Social Welfare Organisation. Contact us for volunteering, donations, blood donation queries, partnerships and community welfare enquiries.',
  },

  '/volunteer': {
    title: `Volunteer With Us | ${BRAND}`,
    description:
      'Join Chhatradol Social Welfare Organisation as a volunteer. Contribute to blood donation camps, health initiatives, education programs and community service in West Bengal.',
  },

  '/donate': {
    title: `Donate to ${BRAND} | Support Community Welfare`,
    description:
      'Support the welfare initiatives of Chhatradol Social Welfare Organisation. Your donation helps fund blood donation camps, education, health camps and community development.',
  },

  '/blood-request': {
    title: `Emergency Blood Request | ${BRAND}`,
    description:
      'Submit an emergency blood request to Chhatradol Social Welfare Organisation. We connect patients with voluntary blood donors across West Bengal.',
  },

  '/organise-blood-camp': {
    title: `Organise a Blood Donation Camp | ${BRAND}`,
    description:
      'Apply to organise a blood donation camp with Chhatradol Social Welfare Organisation. We provide complete support for planning and running successful blood drives.',
  },

  '/terms': {
    title: `Terms & Conditions | ${BRAND}`,
    description:
      'Read the terms and conditions for using the Chhatradol Social Welfare Organisation website, including donation policies and user responsibilities.',
  },

  '/privacy': {
    title: `Privacy Policy | ${BRAND}`,
    description:
      'Read the privacy policy of Chhatradol Social Welfare Organisation. Learn how we collect, use, and protect your personal information.',
  },

  '/refunds': {
    title: `Refund Policy | ${BRAND}`,
    description:
      'Read the donation refund and cancellation policy of Chhatradol Social Welfare Organisation.',
  },

  '/shipping': {
    title: `Shipping & Delivery Policy | ${BRAND}`,
    description:
      'Read the shipping and delivery policy of Chhatradol Social Welfare Organisation.',
  },

  // ── Non-indexed pages ───────────────────────────────────────────────────
  '/login': {
    title: `Member Login | ${BRAND}`,
    description: 'Log in to the Chhatradol Social Welfare Organisation member portal.',
    robots: 'noindex, nofollow',
  },

  '/admin-login': {
    title: `Admin Login | ${BRAND}`,
    description: 'Admin login for Chhatradol Social Welfare Organisation.',
    robots: 'noindex, nofollow',
  },

  '/404': {
    title: `Page Not Found | ${BRAND}`,
    description: 'The page you are looking for could not be found.',
    robots: 'noindex',
  },

  '/interactive-forms': {
    title: `Interactive Forms | ${BRAND}`,
    description: 'Dynamic forms for Chhatradol Social Welfare Organisation.',
    robots: 'noindex, nofollow',
  },
};
