/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[class*="app-dark"]'],
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    screens: {
      sm: '576px',
      md: '768px',
      lg: '992px',
      xl: '1200px',
      '2xl': '1920px',
    },
    extend: {
      colors: {
        'trab-primary': '#1B6B3D',
        'trab-primary-hover': '#25854D',
        'trab-accent': '#D4AF37',
        'trab-bg': '#F8FAF9',
        'trab-surface': '#FFFFFF',
        'trab-border': '#E2E8F0',
        'trab-text': '#1E293B',
        'trab-muted': '#64748B',
        'trab-success': '#10B981',
        'trab-danger': '#EF4444',
        'trab-warning': '#F59E0B',
        'trab-info': '#3B82F6',
      }
    }
  },
  plugins: [],
}
