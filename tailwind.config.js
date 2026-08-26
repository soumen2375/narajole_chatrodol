/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:      ['"DM Sans"', 'Inter', '"Noto Sans Bengali"', 'system-ui', '-apple-system', 'sans-serif'],
        display:   ['Archivo', '"DM Sans"', 'system-ui', 'sans-serif'],
        archivo:   ['Archivo', '"DM Sans"', 'system-ui', 'sans-serif'],
        dmsans:    ['"DM Sans"', 'Inter', '"Noto Sans Bengali"', 'sans-serif'],
        dmmono:    ['"DM Mono"', '"Roboto Mono"', 'ui-monospace', 'monospace'],
        serif:     ['Georgia', '"Noto Serif"', '"Noto Serif Bengali"', 'serif'],
        bengali:   ['"Noto Sans Bengali"', '"DM Sans"', 'sans-serif'],
        'serif-bn':['"Noto Serif Bengali"', 'Georgia', '"Noto Serif"', 'serif'],
        'serif-en':['Georgia', '"Noto Serif"', 'serif'],
        roboto:    ['Inter', '"Noto Sans Bengali"', 'sans-serif'],
        mono:      ['"DM Mono"', '"Roboto Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        /* ── Chhatradol design-system tokens (public site) ── */
        site: {
          green:      '#0d4d3d',
          'green-2':  '#0a3b2f',
          cream:      '#f4f9ea',
          yellow:     '#ffc800',
          red:        '#e2492e',
          blood:      '#8f2116',
          ink:        '#10241d',
          muted:      '#5c6b64',
          soft:       '#4c5b54',
          faint:      '#7d8f83',
          line:       'rgba(13,77,61,.14)',
          'line-2':   'rgba(13,77,61,.22)',
          field:      '#fbfdf6',
          sand:       '#f0e2b8',
          'sand-2':   '#e6d29c',
          'sand-3':   '#e3d3a1',
        },
        /* legacy tokens kept for member/admin dashboards */
        brand: {
          DEFAULT: '#c2410c',
          dark:    '#9a3412',
          light:   '#ea580c',
        },
        accent: '#b45309',
        ink:    '#1c1917',
        cream:  '#faf6ef',
      },
      borderRadius: {
        soft:    '16px',
        card:    '20px',
        panel:   '24px',
        capsule: '90px',
        stat:    '70px',
      },
      maxWidth: {
        '8xl': '1320px',
        site: '1240px',
      },
    },
  },
  plugins: [],
};
