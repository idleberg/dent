import { platform } from 'node:os';
import type { Command } from 'commander';
import { logger } from '../log.ts';

export const defaultLineEndings = platform() === 'win32' ? 'crlf' : 'lf';

export type FormattingOptions = {
	eol: 'crlf' | 'lf';
	indentSize: number;
	useSpaces: boolean;
	trim: boolean;
};

export function applyFormattingOptions(cmd: Command): Command {
	return cmd
		.optionsGroup('Formatting Options')
		.option(
			'-e, --eol <"crlf"|"lf">',
			'control how line-breaks are represented',
			(value) => {
				if (!['crlf', 'lf'].includes(value)) {
					logger.warn(`Invalid EOL value provided, defaulting to "${defaultLineEndings}".`);

					return defaultLineEndings;
				}

				return value;
			},
			defaultLineEndings,
		)
		.option(
			'-i, --indent-size <number>',
			'number of units per indentation level',
			(value) => Number.parseInt(value, 10),
			2,
		)
		.option('-s, --use-spaces', 'indent with spaces instead of tabs', false)
		.option('-t, --trim', 'trim empty lines', true);
}

export function warnFormattingOptions(options: FormattingOptions): void {
	if (options.indentSize !== 2 && options.useSpaces === false) {
		logger.warn(`The "indent-size" option is ignored when "use-spaces" is not set.`);
	}
}
