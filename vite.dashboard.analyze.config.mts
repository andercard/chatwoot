import path from 'path';
import { mergeConfig, type PluginOption } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import baseConfig from './vite.config';

export default mergeConfig(baseConfig, {
  plugins: [
    visualizer({
      filename: path.resolve(__dirname, 'tmp/bundle-analysis/dashboard.json'),
      template: 'raw-data',
      gzipSize: true,
      projectRoot: __dirname,
    }) as PluginOption,
  ],
});
