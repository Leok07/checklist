/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        plum: {
          top: '#5B2B5C',
          mid: '#3D1C45',
          deep: '#23102D',
          panel: '#351F43',
          strong: '#2B1738',
          track: '#6A416C',
        },
        pearl: {
          light: '#ECE3EE',
          base: '#E6DCE8',
          mid: '#D3C3D8',
          edge: '#9E8AA6',
          ink: '#22122A',
        },
        rose: {
          accent: '#E07AB0',
          blush: '#F09AC6',
          soft: '#B45A8B',
          orchid: '#B06BA3',
          mauve: '#8F6A9A',
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
