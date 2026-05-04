import { glob, readFile } from 'node:fs/promises';
import type { Command } from 'commander';
import { blue } from 'kleur/colors';
import { logger } from '../log.ts';
import { fileExists } from '../utils.ts';
import { type FormattingOptions, warnFormattingOptions } from './options.ts';

export type SharedOptions = FormattingOptions & { debug: boolean };

export type DentOptions = {
	endOfLines: 'crlf' | 'lf';
	indentSize: number;
	trimEmptyLines: boolean;
	useTabs: boolean;
};

export function prepareAction<T extends SharedOptions>(args: string[], command: Command): T {
	const options = command.optsWithGlobals() as T;

	if (!args.length) {
		command.help();
	}

	if (options.debug) {
		logger.debug('\nCLI parameters:', { args, options });
	}

	warnFormattingOptions(options);

	return options;
}

export function dentOptionsFrom(options: FormattingOptions): DentOptions {
	return {
		endOfLines: options.eol,
		indentSize: options.indentSize,
		trimEmptyLines: options.trim,
		useTabs: !options.useSpaces,
	};
}

export async function resolveFiles(patterns: string[]): Promise<string[]> {
	return Array.fromAsync(glob(patterns, { cwd: process.cwd() }));
}

export async function loadScript(file: string): Promise<string | null> {
	if (!file.endsWith('.nsi') && !file.endsWith('.nsh')) {
		logger.warn(`${blue(file)} is not an NSIS script, skipping.`);
		return null;
	}

	if ((await fileExists(file)) === false) {
		logger.warn(`${blue(file)} does not exist, skipping.`);
		return null;
	}

	return (await readFile(file)).toString();
}
