/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        bengali:   ['"Noto Sans Bengali"', 'sans-serif'],
        'serif-bn':['"Noto Serif Bengali"', '"Noto Sans Bengali"', 'serif'],
        'serif-en':['"Noto Serif"', 'Georgia', 'serif'],
        roboto:    ['Roboto', 'sans-serif'],
        mono:      ['"Roboto Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          DEFAULT: '#c2410c',
          dark:    '#9a3412',
          light:   '#ea580c',
        },
        accent: '#b45309',
        ink:    '#1c1917',
        cream:  '#faf6ef',
      },
      maxWidth: {
        '8xl': '1320px',
      },
    },
  },
  plugins: [],
};
