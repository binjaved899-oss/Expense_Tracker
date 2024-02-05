/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['InterLocal', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrainsMonoLocal', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
