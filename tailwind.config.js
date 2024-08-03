/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      backgroundImage: {
        vignette: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0) 40%, rgba(59, 55, 119, .1) 70%, rgba(58, 80, 66, .4) 100%)',
      },
    },
    fontFamily: {
      sans: ['CCBackBeatRegular', 'Helvetica', 'Arial', 'sans-serif'],
      custom: ['CCBackBeatRegular'],
    },
  },
  plugins: [],
}
