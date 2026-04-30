#!/usr/bin/env node

import { platform } from 'node:os';
import { Command } from 'commander';
import { logger } from './log.ts';
import { getVersion } from './utils.ts';

export async function handleCLI() {
	const program = new Command('dent');

	const version = await getVersion();
	const defaultLineEndings = platform() === 'win32' ? 'crlf' : 'lf';

	program
		.version(version)
		.configureOutput({
			writeOut: (message: string) => logger.log(message),
			writeErr: (message: string) => logger.error(message),
		})
		.description('CLI tool to format NSIS scripts')
		.arguments('[file...]')
		.option('-D, --debug', 'prints additional debug messages', false)
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
		.option('-t, --trim', 'trim empty lines', true)
		.option('-w, --write', 'edit files in-place', false)
		.parse(process.argv);

	const options = program.opts();
	const args = Array.isArray(program.args) ? program.args : [program.args];

	if (!args.length) {
		program.help();
	}

	if (options.debug) {
		logger.debug('\nCLI parameters:', { args, options });
	}

	if (options.indentSize !== 2 && options.useSpaces === false) {
		logger.warn(`The "indent-size" option is ignored when "use-spaces" is not set.`);
	}

	return { args, options };
}
