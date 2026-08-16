/**
 * structuredData.ts
 *
 * Helpers for injecting / removing JSON-LD structured data scripts in <head>.
 * Every function creates a <script type="application/ld+json"> with a stable ID
 * so repeated calls replace rather than duplicate the tag.
 */

const SITE_URL = 'https://www.chhatradol.org';

// ── Private helpers ─────────────────────────────────────────────────────────

function upsertJsonLd(id: string, data: Record<string, unknown>): void {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function removeJsonLd(id: string): void {
  document.getElementById(id)?.remove();
}

// ── Organization ────────────────────────────────────────────────────────────

const SCHEMA_ORG_ID = 'ld-organization';

export function injectOrganizationSchema(): void {
  upsertJsonLd(SCHEMA_ORG_ID, {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Chhatradol Social Welfare Organisation',
    alternateName: 'Chhatradol SWO',
    url: SITE_URL,
    logo: `${SITE_URL}/assets/images/logo.png`,
    email: 'info@chhatradol.org',
    telephone: '+917811073412',
    foundingDate: '2019',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Vill. & P.O.: Nij Narajole, P.S.: Daspur',
      addressLocality: 'Paschim Medinipur',
      addressRegion: 'West Bengal',
      postalCode: '721211',
      addressCountry: 'IN',
    },
    sameAs: [
      'https://facebook.com/chhatradolswo',
      'https://instagram.com/chhatradolswo',
      'https://x.com/Chhatradolswo',
      'https://youtube.com/@Chhatradolswo',
    ],
    description:
      'Chhatradol Social Welfare Organisation is a public charitable trust working for education, health, environment and relief of the poor in West Bengal.',
  });
}

export function removeOrganizationSchema(): void {
  removeJsonLd(SCHEMA_ORG_ID);
}

// ── WebSite ─────────────────────────────────────────────────────────────────

const SCHEMA_WEBSITE_ID = 'ld-website';

export function injectWebSiteSchema(): void {
  upsertJsonLd(SCHEMA_WEBSITE_ID, {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Chhatradol Social Welfare Organisation',
    url: SITE_URL,
  });
}

export function removeWebSiteSchema(): void {
  removeJsonLd(SCHEMA_WEBSITE_ID);
}

// ── BreadcrumbList ──────────────────────────────────────────────────────────

const SCHEMA_BREADCRUMB_ID = 'ld-breadcrumb';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function injectBreadcrumbSchema(items: BreadcrumbItem[]): void {
  upsertJsonLd(SCHEMA_BREADCRUMB_ID, {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  });
}

export function removeBreadcrumbSchema(): void {
  removeJsonLd(SCHEMA_BREADCRUMB_ID);
}

// ── Event ───────────────────────────────────────────────────────────────────

const SCHEMA_EVENT_ID = 'ld-event';

export interface EventSchemaData {
  name: string;
  startDate: string;
  endDate?: string;
  location?: string;
  description?: string;
  image?: string;
  url: string;
  eventStatus?: 'EventScheduled' | 'EventPostponed' | 'EventCancelled' | 'EventMovedOnline';
}

export function injectEventSchema(event: EventSchemaData): void {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    startDate: event.startDate,
    url: event.url,
    organizer: {
      '@type': 'Organization',
      name: 'Chhatradol Social Welfare Organisation',
      url: SITE_URL,
    },
    eventStatus: event.eventStatus
      ? `https://schema.org/${event.eventStatus}`
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  };

  if (event.endDate) data.endDate = event.endDate;
  if (event.description) data.description = event.description;
  if (event.image) {
    data.image = event.image.startsWith('http')
      ? event.image
      : `${SITE_URL}${event.image.startsWith('/') ? '' : '/'}${event.image}`;
  }
  if (event.location) {
    data.location = {
      '@type': 'Place',
      name: event.location,
      address: {
        '@type': 'PostalAddress',
        addressRegion: 'West Bengal',
        addressCountry: 'IN',
      },
    };
  }

  upsertJsonLd(SCHEMA_EVENT_ID, data);
}

export function removeEventSchema(): void {
  removeJsonLd(SCHEMA_EVENT_ID);
}
