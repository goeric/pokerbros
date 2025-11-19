import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './emails/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        display: ['var(--font-space-grotesk)', 'sans-serif'],
      },
      colors: {
        poker: {
          dark: '#020906',      // Deepest Green/Black
          felt: '#0f392b',      // Rich Table Green
          feltLight: '#1c5b42', // Lighter felt
          gold: '#D4AF37',      // Casino Gold
          goldlight: '#F3E5AB', // Light Gold
          red: '#D92828',       // Casino Red
          black: '#111111',     // True Black
          green: '#059669',     // Keep for backwards compatibility
          profit: '#10B981',
          loss: '#EF4444',
        },
        background: {
          light: '#FFFFFF',
          'light-secondary': '#F9FAFB',
          dark: '#020906',      // Updated to match poker-dark
          'dark-secondary': '#0f392b', // Updated to match poker-felt
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
      backgroundImage: {
        'casino-gradient': 'radial-gradient(circle at 50% 0%, #163e2f 0%, #020906 100%)',
        'gold-gradient': 'linear-gradient(45deg, #D4AF37 0%, #F3E5AB 50%, #D4AF37 100%)',
        'card-shine': 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.05) 25%, transparent 30%)',
      },
      animation: {
        'coin-drop': 'coinDrop 0.6s ease-out',
        'slide-in': 'slideIn 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'gold-pulse': 'goldPulse 3s ease-in-out infinite',
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
        goldPulse: {
          '0%, 100%': { filter: 'drop-shadow(0 0 2px rgba(212, 175, 55, 0.3))' },
          '50%': { filter: 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.6))' },
        },
      },
    },
  },
  plugins: [],
}
export default config
