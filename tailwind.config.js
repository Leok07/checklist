/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vice: {
          cyan: '#00F0FF',
          magenta: '#FF2E93',
          sunset: '#FF7A59',
          gold: '#FFB84D',
          violet: '#A855F7',
          mint: '#10F5A8',
          crimson: '#FF3B5C',
        },
      },
      fontFamily: {
        display: ['Outfit', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
