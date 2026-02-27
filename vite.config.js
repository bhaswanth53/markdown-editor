import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'MarkdownEditor',
      formats: ['es', 'umd'],
      fileName: (format) => `markdown-editor.${format}.js`,
    },
    rollupOptions: {
      // Mark peer deps as external so consumers can provide their own
      external: [],
      output: {
        globals: {
          'highlight.js': 'hljs',
          'marked': 'marked',
        },
      },
    },
    cssCodeSplit: false,
  },
});
