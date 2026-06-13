import { parse } from '@nsis/nlf';

export default function NsisLanguageFilePlugin() {
	return {
		name: 'nlf',
		transform(src: string, id: string) {
			if (!/\.nlf$/.test(id)) {
				return;
			}

			const output = parse(src);

			return {
				code: `const data = ${JSON.stringify(output)};export default data;`,
			};
		},
	};
}
