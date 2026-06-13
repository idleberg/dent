import { defineConfig } from 'vitest/config';
import nlf from './src/plugin.ts';

export default defineConfig({
	plugins: [nlf()],
});
