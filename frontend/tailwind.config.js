export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f6f3ff',
          100: '#ede8ff',
          200: '#ddd3ff',
          300: '#c3b1fe',
          400: '#a386fb',
          500: '#8a5cf6',
          600: '#7641ea',
          700: '#6530cf',
          800: '#5228a8',
          900: '#2a1760',
          950: '#1c0f45',
        },
        accent: {
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
        },
        canvas: '#f4f2fa',
        surface: '#ffffff',
        subtle: '#f7f5fc',
        line: '#e7e3f1',
        ink: '#1b1533',
        muted: '#6d6887',
        faint: '#9a95b0',
      },
    },
  },
};
