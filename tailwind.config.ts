import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        poker: {
          green: '#059669',
          gold: '#D97706', // amber-600 for better contrast (was #F59E0B)
          'gold-light': '#B45309', // amber-700 for even better contrast on light backgrounds
          'gold-dark': '#FBBF24', // amber-400 for dark mode
          profit: '#10B981',
          loss: '#EF4444',
        },
        background: {
          light: '#FFFFFF',
          'light-secondary': '#F9FAFB',
          dark: '#0F172A',
          'dark-secondary': '#1E293B',
        },
        card: {
          light: '#FFFFFF',
          'light-hover': '#F9FAFB',
          dark: '#1E293B',
          'dark-hover': '#334155',
        },
        border: {
          light: '#E5E7EB',
          dark: '#334155',
        },
        text: {
          'light-primary': '#111827',
          'light-secondary': '#6B7280',
          'dark-primary': '#F9FAFB',
          'dark-secondary': '#94A3B8',
        },
      },
      animation: {
        'coin-drop': 'coinDrop 0.6s ease-out',
        'slide-in': 'slideIn 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        coinDrop: {
          '0%': { transform: 'translateY(-100px) rotate(0deg)', opacity: '0' },
          '50%': { transform: 'translateY(0) rotate(180deg)', opacity: '1' },
          '100%': { transform: 'translateY(0) rotate(360deg)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
export default config
