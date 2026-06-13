import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../log.ts';
import { applyFormattingOptions } from './options.ts';
import { dentOptionsFrom, loadScript, prepareAction, processFiles, resolveFiles } from './shared.ts';

describe('dentOptionsFrom', () => {
	it('maps CLI options to dent formatter options', () => {
		expect(dentOptionsFrom({ eol: 'lf', indentSize: 4, printWidth: 120, useSpaces: true, trim: false })).toEqual({
			endOfLine: 'lf',
			indentSize: 4,
			printWidth: 120,
			trimEmptyLines: false,
			useTabs: false,
		});
	});

	it('inverts useSpaces into useTabs', () => {
		expect(
			dentOptionsFrom({ eol: 'crlf', indentSize: 2, printWidth: 120, useSpaces: false, trim: true }),
		).toMatchObject({
			useTabs: true,
		});
	});
});

describe('resolveFiles', () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'dent-resolve-'));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it('resolves a literal path', async () => {
		const file = join(dir, 'a.nsi');
		await writeFile(file, '');

		const files = await resolveFiles([file]);
		expect(files).toContain(file);
	});

	it('expands glob patterns', async () => {
		await writeFile(join(dir, 'a.nsi'), '');
		await writeFile(join(dir, 'b.nsi'), '');
		await writeFile(join(dir, 'c.txt'), '');

		const files = await resolveFiles([join(dir, '*.nsi')]);
		expect(files).toHaveLength(2);
	});

	it('returns an empty array for a pattern that matches nothing', async () => {
		const files = await resolveFiles([join(dir, '*.nope')]);
		expect(files).toEqual([]);
	});

	it('expands a directory to *.nsi and *.nsh files inside it', async () => {
		await writeFile(join(dir, 'a.nsi'), '');
		await writeFile(join(dir, 'b.nsh'), '');
		await writeFile(join(dir, 'c.txt'), '');

		const files = await resolveFiles([dir]);
		expect(files).toHaveLength(2);
		expect(files.some((f) => f.endsWith('a.nsi'))).toBe(true);
		expect(files.some((f) => f.endsWith('b.nsh'))).toBe(true);
	});
});

describe('loadScript', () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'dent-load-'));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
		vi.restoreAllMocks();
	});

	it('reads a .nsi file', async () => {
		const file = join(dir, 'a.nsi');
		await writeFile(file, 'Section\nSectionEnd');

		expect(await loadScript(file)).toBe('Section\nSectionEnd');
	});

	it('reads a .nsh file', async () => {
		const file = join(dir, 'a.nsh');
		await writeFile(file, '!define X');

		expect(await loadScript(file)).toBe('!define X');
	});

	it('returns null and warns for non-NSIS extensions', async () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		const file = join(dir, 'a.txt');
		await writeFile(file, 'hello');

		expect(await loadScript(file)).toBeNull();
		expect(warn.mock.calls[0]?.[0]).toContain('not an NSIS script');
	});

	it('returns null and warns for missing files', async () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

		expect(await loadScript(join(dir, 'missing.nsi'))).toBeNull();
		expect(warn.mock.calls[0]?.[0]).toContain('does not exist');
	});
});

describe('prepareAction', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	function buildCommand() {
		const silent = { writeOut: () => undefined, writeErr: () => undefined };
		const root = new Command('dent').exitOverride().configureOutput(silent).option('-D, --debug', '', false);
		const sub = new Command('sub').exitOverride().configureOutput(silent);
		applyFormattingOptions(sub);
		root.addCommand(sub);
		return { root, sub };
	}

	it('returns merged options including parent globals', () => {
		const { root, sub } = buildCommand();
		root.parse(['--debug', 'sub'], { from: 'user' });

		const opts = prepareAction(['file.nsi'], sub);
		expect(opts.debug).toBe(true);
		expect(opts.eol).toBeDefined();
	});

	it('logs CLI parameters when --debug is set', () => {
		const debug = vi.spyOn(logger, 'debug').mockImplementation(() => undefined);
		const { root, sub } = buildCommand();
		root.parse(['--debug', 'sub'], { from: 'user' });

		prepareAction(['file.nsi'], sub);
		expect(debug).toHaveBeenCalledOnce();
	});

	it('does not log when --debug is unset', () => {
		const debug = vi.spyOn(logger, 'debug').mockImplementation(() => undefined);
		const { root, sub } = buildCommand();
		root.parse(['sub'], { from: 'user' });

		prepareAction(['file.nsi'], sub);
		expect(debug).not.toHaveBeenCalled();
	});

	it('calls command.help() when args is empty and no stdin', () => {
		const originalIsTTY = process.stdin.isTTY;
		process.stdin.isTTY = true;

		const { root, sub } = buildCommand();
		root.parse(['sub'], { from: 'user' });

		// `command.help()` exits the process; with exitOverride it throws CommanderError.
		expect(() => prepareAction([], sub)).toThrow();

		process.stdin.isTTY = originalIsTTY;
	});
});

describe('processFiles', () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'dent-process-'));
		vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		vi.spyOn(logger, 'error').mockImplementation(() => undefined);
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
		vi.restoreAllMocks();
	});

	it('calls onFile for each loadable script', async () => {
		const a = join(dir, 'a.nsi');
		const b = join(dir, 'b.nsi');
		await writeFile(a, 'Section\nSectionEnd\n');
		await writeFile(b, 'Name "test"\n');

		const visited: string[] = [];
		await processFiles(
			[a, b],
			(_input) => null,
			1,
			(file) => {
				visited.push(file);
			},
			() => {},
		);

		expect(visited).toEqual([a, b]);
	});

	it('skips non-NSIS files without calling onFile', async () => {
		const txt = join(dir, 'readme.txt');
		const nsi = join(dir, 'a.nsi');
		await writeFile(txt, 'hello');
		await writeFile(nsi, 'Name "test"\n');

		const visited: string[] = [];
		await processFiles(
			[txt, nsi],
			() => null,
			1,
			(file) => {
				visited.push(file);
			},
			() => {},
		);

		expect(visited).toEqual([nsi]);
	});

	it('calls onError and continues when check throws', async () => {
		const a = join(dir, 'a.nsi');
		const b = join(dir, 'b.nsi');
		await writeFile(a, 'bad');
		await writeFile(b, 'good');

		const errors: string[] = [];
		const visited: string[] = [];
		await processFiles(
			[a, b],
			(input) => {
				if (input === 'bad') throw new Error('parse fail');
				return null;
			},
			1,
			(file) => {
				visited.push(file);
			},
			(file) => {
				errors.push(file);
			},
		);

		expect(errors).toEqual([a]);
		expect(visited).toEqual([b]);
	});

	it('exits with the configured code when no files match', async () => {
		const exit = vi
			.spyOn(process, 'exit')
			.mockImplementation((() => undefined) as (code?: string | number | null) => never);

		await processFiles(
			[join(dir, '*.nope')],
			() => null,
			42,
			() => {},
			() => {},
		);

		expect(exit).toHaveBeenCalledWith(42);
	});

	it('returns elapsed duration', async () => {
		const file = join(dir, 'a.nsi');
		await writeFile(file, 'Name "x"\n');

		const { duration } = await processFiles(
			[file],
			() => null,
			1,
			() => {},
			() => {},
		);

		expect(duration).toBeGreaterThanOrEqual(0);
	});

	it('passes result and rawContents to onFile', async () => {
		const file = join(dir, 'a.nsi');
		await writeFile(file, 'Name "x"\n');

		let capturedResult: string | null = null;
		let capturedRaw = '';
		await processFiles(
			[file],
			() => 'Name "y"\n',
			1,
			(_file, result, rawContents) => {
				capturedResult = result;
				capturedRaw = rawContents;
			},
			() => {},
		);

		expect(capturedRaw).toBe('Name "x"\n');
		expect(capturedResult).toBe('Name "y"\n');
	});
});
