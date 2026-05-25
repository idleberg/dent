import { writeFile } from 'node:fs/promises';
import { createFormatter } from '@nsis/dent';
import { Command } from 'commander';
import { blue, dim } from 'kleur/colors';
import { logger } from '../log.js';
import { applyFormattingOptions } from './options.js';
import {
	dentOptionsFrom,
	hasStdin,
	loadScript,
	prepareAction,
	readStdin,
	resolveFiles,
	type SharedOptions,
} from './shared.js';

type CheckOptions = SharedOptions & { write: boolean };

export function checkCommand(): Command {
	const cmd = new Command('check')
		.description('check if NSIS scripts are formatted correctly')
		.arguments('[file...]')
		.action(async (args: string[], _opts, command: Command) => {
			const options = prepareAction<CheckOptions>(args, command);
			await runCheck(args, options);
		});

	applyFormattingOptions(cmd);
	cmd.option('-w, --write', 'edit files in-place, if check fails', false);

	return cmd;
}

async function runCheck(patterns: string[], options: CheckOptions): Promise<void> {
	const { check } = createFormatter(dentOptionsFrom(options));

	if (!patterns.length && hasStdin()) {
		logger.start('Checking standard input...');
		if (options.write) {
			logger.warn('the "--write" option is ignored when reading from stdin.');
		}
		const startTime = performance.now();
		const rawContents = await readStdin();
		const result = check(rawContents);
		const duration = Math.round(performance.now() - startTime);

		if (result !== null) {
			logger.warn(`Script has issues ${dim(`(${duration}ms)`)}`);
			logger.success(`Completed in ${duration}ms.`);
			process.exit(1);
		}

		logger.info(`Script already formatted ${dim(`(${duration}ms)`)}`);
		logger.success(`Completed in ${duration}ms.`);
		return;
	}

	const files = await resolveFiles(patterns);

	if (files.length === 0) {
		logger.error('No valid input files provided, exiting.');
		process.exit(2);
	}

	logger.start(`Checking ${patterns.length} ${patterns.length === 1 ? 'file' : 'files'}...`);

	const outerStartTime = performance.now();
	const drifted: string[] = [];

	for (const file of files) {
		const startTime = performance.now();
		const rawContents = await loadScript(file);
		if (rawContents === null) continue;

		const result = check(rawContents);
		const duration = Math.round(performance.now() - startTime);

		if (result === null) {
			logger.info(`${blue(file)} already formatted ${dim(`(${duration}ms)`)}`);
			continue;
		}

		drifted.push(file);

		if (options.write) {
			await writeFile(file, result, { encoding: 'utf-8' });
			logger.info(`${blue(file)} formatted ${dim(`(${duration}ms)`)}`);
		} else {
			logger.warn(`${blue(file)} has issues ${dim(`(${duration}ms)`)}`);
		}
	}

	const outerDuration = Math.round(performance.now() - outerStartTime);

	logger.success(`Completed in ${outerDuration}ms.`);

	if (drifted.length >= 1) {
		process.exit(1);
	}
}
