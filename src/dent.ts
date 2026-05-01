import { platform } from 'node:os';
import { detectNewline } from 'detect-newline';
import { parse } from './parser.ts';
import { print } from './printer.ts';

const defaultIndentation = 2;

export type DentOptions = {
	endOfLines?: 'crlf' | 'lf';
	indentSize?: number;
	trimEmptyLines?: boolean;
	useTabs?: boolean;
};

export type DentFunctions = {
	format: (fileContents: string) => string;
	check: (fileContents: string) => boolean;
};

/**
 * Formats the given file contents using the Dent formatting style.
 *
 * @param {Options} options - The options for the Dent formatter.
 * @returns An object with `format` and `check` functions.
 * @throws {Error} Throws an error if the options are invalid.
 */
export function createFormatter(options: DentOptions = {}): DentFunctions {
	const mergedOptions: DentOptions = {
		indentSize: defaultIndentation,
		trimEmptyLines: true,
		useTabs: true,
		...options,
	};

	if (mergedOptions.useTabs === false) {
		if (!mergedOptions.indentSize || Number.isNaN(mergedOptions.indentSize) || mergedOptions.indentSize <= 0) {
			throw Error('The indentSize option expects a positive integer');
		}
	}

	/**
	 * Formats the given file contents using the Dent formatting style.
	 *
	 * Parses the input into a CST, then prints it back with canonical
	 * casing, normalised whitespace, and tree-depth-based indentation.
	 *
	 * @param {string} fileContents - The contents of the file to be formatted.
	 * @returns {string} The formatted file contents.
	 */
	function format(fileContents: string): string {
		const nodes = parse(fileContents);
		const eol = detectEOL(fileContents);

		return print(nodes, {
			useTabs: mergedOptions.useTabs ?? true,
			indentSize: mergedOptions.indentSize ?? defaultIndentation,
			trimEmptyLines: mergedOptions.trimEmptyLines ?? true,
			eol,
		});
	}

	/**
	 * Checks whether the given file contents are already compliant with the
	 * current format settings (i.e. formatting would not change the code).
	 *
	 * @param {string} fileContents - The contents of the file to check.
	 * @returns {boolean} `true` if the file is already formatted, `false` otherwise.
	 */
	function check(fileContents: string): boolean {
		return format(fileContents) === fileContents;
	}

	/**
	 * Determines the desired end-of-line characters for the output.
	 *
	 * @param {string} input - The input string (used as fallback for detection).
	 * @returns {string} The end-of-line characters to use in the output.
	 */
	function detectEOL(input: string): string {
		if (mergedOptions.endOfLines) {
			return mergedOptions.endOfLines === 'crlf' ? '\r\n' : '\n';
		}

		const detected = detectNewline(input);
		return detected ?? (platform() === 'win32' ? '\r\n' : '\n');
	}

	return { format, check };
}
