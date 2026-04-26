/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,ts}'],
  theme: {
    extend: {
      colors: {
        stock: '#1d4ed8',
        flow: '#0369a1',
        aux: '#7c3aed',
      },
    },
  },
  plugins: [],
};
