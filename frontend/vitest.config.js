import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals:     true,
    setupFiles:  ['./src/tests/setup.globals.js', './src/tests/setup.js'],
    css:         true,
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude:  ['node_modules/', 'src/tests/', 'src/locales/']
    }
  }
});
