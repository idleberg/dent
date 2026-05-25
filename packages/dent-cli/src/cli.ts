#!/usr/bin/env node

import { Command } from 'commander';
import { checkCommand } from './commands/check.js';
import { formatCommand } from './commands/format.js';
import { logger } from './log.js';
import { getVersion } from './utils.js';

export async function handleCLI(): Promise<void> {
	const program = new Command('dent');

	const version = await getVersion();

	program
		.version(version)
		.configureOutput({
			writeOut: (message: string) => logger.log(message),
			writeErr: (message: string) => logger.error(message),
		})
		.description('CLI tool to format NSIS scripts')
		.option('-D, --debug', 'prints additional debug messages', false)
		.addCommand(formatCommand())
		.addCommand(checkCommand());

	if (process.argv.length <= 2) {
		program.outputHelp();
		return;
	}

	await program.parseAsync(process.argv);
}
