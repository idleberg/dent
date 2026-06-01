import { glob, readFile } from 'node:fs/promises';
import type { Command } from 'commander';
import { blue } from 'kleur/colors';
import { logger } from '../log.ts';
import { fileExists } from '../utils.ts';
import { type FormattingOptions, warnFormattingOptions } from './options.ts';

export type SharedOptions = FormattingOptions & { debug: boolean };

export type DentOptions = {
	endOfLine: 'crlf' | 'lf';
	indentSize: number;
	printWidth: number;
	singleQuote: boolean;
	trimEmptyLines: boolean;
	useTabs: boolean;
};

export function hasStdin(): boolean {
	return !process.stdin.isTTY;
}

export async function readStdin(): Promise<string> {
	const chunks: Buffer[] = [];

	for await (const chunk of process.stdin) {
		chunks.push(chunk);
	}

	return Buffer.concat(chunks).toString();
}

export function prepareAction<T extends SharedOptions>(args: string[], command: Command): T {
	const options = command.optsWithGlobals() as T;

	if (!args.length && !hasStdin()) {
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
		endOfLine: options.eol,
		indentSize: options.indentSize,
		printWidth: options.printWidth,
		singleQuote: options.singleQuote,
		trimEmptyLines: options.trim,
		useTabs: !options.useSpaces,
	};
}

export async function resolveFiles(patterns: string[]): Promise<string[]> {
	return Array.fromAsync(glob(patterns, { cwd: process.cwd() }));
}

export function formatParseError(error: unknown): string {
	if (error instanceof SyntaxError && 'location' in error) {
		const loc = (error as SyntaxError & { location: { start: { line: number; column: number } } }).location;
		return `Parse error at line ${loc.start.line}, column ${loc.start.column}: ${error.message}`;
	}
	return String(error);
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
