/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#163a3d',
        teal: {
          50: '#f0f8f7',
          100: '#d9eeeb',
          200: '#b7ddd8',
          300: '#86c4bd',
          400: '#55a9a2',
          500: '#378e88',
          600: '#2b716e',
          700: '#285b59',
          800: '#244a49',
          900: '#213e3d'
        },
        gold: {
          50: '#fbf8ef',
          100: '#f4ecd4',
          200: '#e9d6a6',
          300: '#dcbc70',
          400: '#cba047',
          500: '#b68732'
        }
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['DM Serif Display', 'Georgia', 'serif']
      },
      boxShadow: {
        soft: '0 20px 60px -30px rgba(22, 58, 61, 0.25)',
        card: '0 14px 40px -24px rgba(22, 58, 61, 0.26)'
      }
    }
  },
  plugins: []
}
