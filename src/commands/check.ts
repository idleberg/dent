import { writeFile } from 'node:fs/promises';
import { createFormatter } from '@nsis/dent';
import { Command } from 'commander';
import { blue, dim } from 'kleur/colors';
import { logger } from '../log.ts';
import { applyFormattingOptions } from './options.ts';
import { dentOptionsFrom, loadScript, prepareAction, resolveFiles, type SharedOptions } from './shared.ts';

type CheckOptions = SharedOptions & { write: boolean };

export function checkCommand(): Command {
	const cmd = new Command('check')
		.description('Check if NSIS scripts are formatted correctly')
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
	const files = await resolveFiles(patterns);

	if (files.length === 0) {
		logger.error('No valid input files provided, exiting.');
		process.exit(2);
	}

	const { check } = createFormatter(dentOptionsFrom(options));

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
