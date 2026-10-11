import { defineConfig } from 'vite';
import ruby from 'vite-plugin-ruby';
import vue from '@vitejs/plugin-vue';
import { aliases, vueOptions } from './vite.shared';
import yaml from '@rollup/plugin-yaml';
import path from 'path';

// Dev only: the dashboard imports ~1,900 locale JSON files (all languages), each
// one a separate request/transform in the dev server. Serve only the locales in
// VITE_DEV_LOCALES (default "en,es"); set it to "all" to load every language.
const devLocales = (process.env.VITE_DEV_LOCALES || 'en,es').split(',');
const i18nIndex = path.resolve('./app/javascript/dashboard/i18n/index.js');

const limitDevLocales = () => ({
  name: 'limit-dev-locales',
  apply: 'serve' as const,
  enforce: 'pre' as const,
  load(id: string) {
    if (devLocales.includes('all') || id.split('?')[0] !== i18nIndex) return null;
    const imports = devLocales.map(l => `import ${l} from './locale/${l}';`);
    return `${imports.join('\n')}\nexport default { ${devLocales.join(', ')} };`;
  },
});

export default defineConfig({
  plugins: [ruby(), vue(vueOptions), yaml(), limitDevLocales()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  resolve: { alias: aliases },
});
