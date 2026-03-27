/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-blue': '#0A1172',
        'dark-green': '#006400',
        'light-yellow': '#FFFFE0',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}