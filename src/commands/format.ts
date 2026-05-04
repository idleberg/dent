import { writeFile } from 'node:fs/promises';
import { createFormatter } from '@nsis/dent';
import { Command } from 'commander';
import { blue, dim } from 'kleur/colors';
import { logger } from '../log.ts';
import { applyFormattingOptions } from './options.ts';
import { dentOptionsFrom, loadScript, prepareAction, resolveFiles, type SharedOptions } from './shared.ts';

type FormatOptions = SharedOptions & { write: boolean };

export function formatCommand(): Command {
	const cmd = new Command('format')
		.description('Format NSIS scripts')
		.arguments('[file...]')
		.action(async (args: string[], _opts, command: Command) => {
			const options = prepareAction<FormatOptions>(args, command);
			await runFormat(args, options);
		});

	applyFormattingOptions(cmd);
	cmd.option('-w, --write', 'edit files in-place', false);

	return cmd;
}

async function runFormat(patterns: string[], options: FormatOptions): Promise<void> {
	const files = await resolveFiles(patterns);

	if (files.length === 0) {
		logger.error('No valid input files provided, exiting.');
		process.exit(1);
	}

	const { check } = createFormatter(dentOptionsFrom(options));

	if (options.write) {
		logger.start(`Formatting ${patterns.length} ${patterns.length === 1 ? 'file' : 'files'}...`);
	}

	const outerStartTime = performance.now();

	for (const file of files) {
		const startTime = performance.now();
		const rawContents = await loadScript(file);
		if (rawContents === null) continue;

		const result = check(rawContents);
		const duration = Math.round(performance.now() - startTime);

		if (options.write) {
			if (result === null) {
				logger.info(`${blue(file)} already formatted ${dim(`(${duration}ms)`)}`);
			} else {
				await writeFile(file, result, { encoding: 'utf-8' });
				logger.info(`${blue(file)} formatted ${dim(`(${duration}ms)`)}`);
			}
		} else {
			process.stdout.write(result ?? rawContents);
		}
	}

	if (options.write) {
		const outerDuration = Math.round(performance.now() - outerStartTime);
		logger.success(`Completed in ${outerDuration}ms.`);
	}
}
