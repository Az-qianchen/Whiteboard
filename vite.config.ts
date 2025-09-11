import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { withPWA } from './plugins/pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Use relative paths in the built HTML so opening dist/index.html via file:// works.
      base: './',
      plugins: [withPWA()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      },
      test: {
        environment: 'jsdom',
        setupFiles: ['src/setupTests.ts'],
        css: true,
        globals: true,
        include: ['tests/**/*.{test,spec}.ts?(x)'],
      }
    };
});
