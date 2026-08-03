/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:      ['Inter', '"Noto Sans Bengali"', 'system-ui', '-apple-system', 'sans-serif'],
        serif:     ['"Noto Serif"', '"Noto Serif Bengali"', 'Georgia', 'serif'],
        bengali:   ['"Noto Sans Bengali"', 'Inter', 'sans-serif'],
        'serif-bn':['"Noto Serif Bengali"', '"Noto Serif"', 'Georgia', 'serif'],
        'serif-en':['"Noto Serif"', 'Georgia', 'serif'],
        roboto:    ['Inter', '"Noto Sans Bengali"', 'sans-serif'],
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
