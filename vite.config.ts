import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  base: '/systems_dynamics/',
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
});
