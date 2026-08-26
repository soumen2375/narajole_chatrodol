import type { ComponentProps } from 'react';

/** 16px stroke icons used in the header nav. stroke-width 1.9, currentColor. */
function Icon({ children, ...rest }: ComponentProps<'svg'>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: ComponentProps<'svg'>) => (
  <Icon {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.5V21h13V9.5" />
    <path d="M9.5 21v-6h5v6" />
  </Icon>
);

export const IconPerson = (p: ComponentProps<'svg'>) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
  </Icon>
);

export const IconGrid = (p: ComponentProps<'svg'>) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Icon>
);

export const IconCalendar = (p: ComponentProps<'svg'>) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Icon>
);

export const IconPhoto = (p: ComponentProps<'svg'>) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="m4 18 5-5 4 4 3-2.5 4 3.5" />
  </Icon>
);

export const IconChart = (p: ComponentProps<'svg'>) => (
  <Icon {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Icon>
);

export const IconPeople = (p: ComponentProps<'svg'>) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.4" />
    <path d="M2.5 20c0-3.6 2.9-5.8 6.5-5.8s6.5 2.2 6.5 5.8" />
    <path d="M16.5 5.2a3.4 3.4 0 0 1 0 6.4M18 14.6c2.1.7 3.5 2.5 3.5 5.4" />
  </Icon>
);

export const IconPhone = (p: ComponentProps<'svg'>) => (
  <Icon {...p}>
    <path d="M7.5 4.5 9.8 9l-2 1.9a12 12 0 0 0 5.3 5.3l1.9-2 4.5 2.3v3.2c0 .9-.8 1.6-1.7 1.5C9.3 20.6 3.4 14.7 2.8 6.2c-.1-.9.6-1.7 1.5-1.7z" />
  </Icon>
);

export const IconSignIn = (p: ComponentProps<'svg'>) => (
  <Icon {...p}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="M10 17l5-5-5-5M15 12H3" />
  </Icon>
);
