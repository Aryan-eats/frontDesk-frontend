import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Shades
        'primary-dark': '#5B21B6',
        'primary': '#7C3AED',
        'primary-light': '#C4B5FD',
        'accent': '#F3E8FF',

        // Neutral Shades
        'text-content': '#334155',
        'text-subtle': '#64748B',
        'border-color': '#E2E8F0',
        'card-bg': '#FFFFFF',
        'page-bg': '#F1F5F9',
      }
    },
  },
  plugins: [],
}
export default config
