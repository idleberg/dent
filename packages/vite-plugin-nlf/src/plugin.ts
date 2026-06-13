import * as NLF from '@nsis/nlf';

export default function NsisLanguageFilePlugin() {
	return {
		name: 'nlf',
		transform(src: string, id: string) {
			if (!/\.nlf$/.test(id)) {
				return;
			}

			const output = NLF.parse(src, {
				minify: true,
				stringify: true,
			});

			return {
				code: [`const data = ${output};`, 'export default data;'].join(''),
			};
		},
	};
}
