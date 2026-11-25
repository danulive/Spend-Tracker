/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        spend: {
          bg: '#000000',
          surface: '#111111',
          raised: '#1B1B1B',
          'wallet-from': '#1E1E1E',
          'wallet-to': '#0C0C0C',
          accent: '#CCFF00',
          text: '#F2F2F2',
          muted: '#999999',
          saved: '#CCFF00',
          exceeded: '#FF453A',
        },
        cat: {
          food: '#CCFF00',
          transport: '#FF5A5F',
          bills: '#38BDF8',
          shopping: '#A855F7',
          other: '#F2F2F2',
        },
      },
      fontFamily: {
        sans: [
          'Inter Variable',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'system-ui',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
