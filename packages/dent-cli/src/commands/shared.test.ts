import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../log.js';
import { applyFormattingOptions } from './options.js';
import { dentOptionsFrom, loadScript, prepareAction, resolveFiles } from './shared.js';

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
