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
          bg: '#FFFDF8',
          surface: '#FFFFFF',
          neutral: '#F5F3EF',
          border: '#E4E1DC',
          text: '#221D19',
          'text-secondary': '#615D59',
          'text-muted': '#77726D',
          green: '#087A3E',
          'green-dark': '#065E31',
          lime: '#CEFF58',
          orange: '#FF5E30',
          'orange-dark': '#D94520',
          ivory: '#F7F5EF',
          blue: '#6C85FF',
          pink: '#FEC2EB',
          red: '#FB3A35',
          sage: '#94AF67',
          yellow: '#FFD84D',
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
