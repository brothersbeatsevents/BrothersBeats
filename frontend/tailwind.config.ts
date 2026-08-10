import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bb: {
          bg: '#12100C',
          surface: '#1D1812',
          neutral: '#262019',
          border: '#3A3226',
          text: '#F6F1E4',
          'text-secondary': '#C9C1B0',
          'text-muted': '#948A78',
          ink: '#0A0806',
          green: '#087A3E',
          'green-dark': '#065E31',
          lime: '#D4AF37',
          orange: '#D4AF37',
          'orange-dark': '#B08A25',
          ivory: '#F7F5EF',
          blue: '#6C85FF',
          pink: '#FEC2EB',
          red: '#FB3A35',
          sage: '#94AF67',
          yellow: '#FFD84D',
          gold: '#D4AF37',
          'gold-dark': '#B08A25',
          'gold-light': '#E7CA6B',
          'pale-green': '#E9F6C4',
          'pale-orange': '#FFF0E9',
          'pale-blue': '#EEF1FF',
          'pale-pink': '#FFF0FA',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
