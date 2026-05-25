import { defineConfig } from 'tsdown';

export default defineConfig((options) => {
	const isProduction = options.watch !== true;

	return {
		target: 'node20',
		clean: isProduction,
		dts: isProduction,
		entry: {
			cli: 'src/main.ts',
		},
		neverBundle: [
			// ensure we always read the current version from the manifest
			'../package.json',
		],
		format: 'esm',
		minify: isProduction,
		outDir: 'bin',
	};
});
