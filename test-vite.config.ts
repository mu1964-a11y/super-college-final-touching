import { defineConfig } from 'vite';
export default defineConfig({
  define: {
    'process.env.TEST': undefined
  }
});
