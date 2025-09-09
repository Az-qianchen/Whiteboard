/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  safelist: [
    // Arbitrary value utilities with CSS variables used across the app
    'bg-[var(--ui-panel-bg)]',
    'border-[var(--ui-panel-border)]',
    'bg-[var(--ui-element-bg)]',
    'bg-[var(--ui-element-bg-hover)]',
    'hover:bg-[var(--ui-element-bg-hover)]',
    'bg-[var(--ui-element-bg-active)]',
    'text-[var(--text-primary)]',
    'text-[var(--text-secondary)]',
    'ring-offset-[var(--ui-panel-bg)]',
    'ring-[var(--accent-primary)]',
    'grid-cols-[auto_1fr]',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
