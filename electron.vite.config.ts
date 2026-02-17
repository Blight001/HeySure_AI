import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import path from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['uuid'] })],
    build: {
      outDir: 'dist-electron/main',
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'electron/main.ts'),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ['uuid'] })],
    build: {
      outDir: 'dist-electron/preload',
      rollupOptions: {
        input: {
          preload: path.resolve(__dirname, 'electron/preload/index.ts'),
        },
      },
    },
  },
  renderer: {
    root: '.',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@stores': path.resolve(__dirname, './src/stores'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@services': path.resolve(__dirname, './src/services'),
        '@types': path.resolve(__dirname, './src/types'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@assets': path.resolve(__dirname, './src/assets'),
      },
    },
    build: {
      outDir: 'dist-electron/renderer',
      rollupOptions: {
        input: {
          main: 'index.html',
        },
      },
    },
  },
});
