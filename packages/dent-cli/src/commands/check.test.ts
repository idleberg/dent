import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../log.js';
import { checkCommand } from './check.js';
import * as shared from './shared.js';

const UNFORMATTED = 'Section "demo"\n  DetailPrint "x"\nSectionEnd\n';
const FORMATTED = 'Section "demo"\n\tDetailPrint "x"\nSectionEnd\n';

function buildRoot() {
	return new Command('dent').exitOverride().option('-D, --debug', '', false).addCommand(checkCommand());
}

describe('checkCommand shape', () => {
	it('is named "check" with the expected description', () => {
		const cmd = checkCommand();
		expect(cmd.name()).toBe('check');
		expect(cmd.description().toLowerCase()).toContain('check');
	});

	it('exposes formatting options plus --write', () => {
		const longs = checkCommand().options.map((opt) => opt.long);
		expect(longs).toEqual(expect.arrayContaining(['--eol', '--indent-size', '--use-spaces', '--no-trim', '--write']));
	});
});

describe('check action', () => {
	let dir: string;
	let exit: ReturnType<typeof vi.spyOn>;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'dent-check-'));
		vi.spyOn(logger, 'start').mockImplementation(() => undefined);
		vi.spyOn(logger, 'info').mockImplementation(() => undefined);
		vi.spyOn(logger, 'success').mockImplementation(() => undefined);
		vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		vi.spyOn(logger, 'error').mockImplementation(() => undefined);
		vi.spyOn(logger, 'debug').mockImplementation(() => undefined);
		exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as (code?: string | number | null) => never);
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
		vi.restoreAllMocks();
	});

	it('exits 0 for an already-formatted file', async () => {
		const file = join(dir, 'clean.nsi');
		await writeFile(file, FORMATTED);

		await buildRoot().parseAsync(['check', file], { from: 'user' });

		expect(exit).not.toHaveBeenCalled();
	});

	it('exits 1 on drift without --write', async () => {
		const file = join(dir, 'dirty.nsi');
		await writeFile(file, UNFORMATTED);

		await buildRoot().parseAsync(['check', file], { from: 'user' });

		expect(exit).toHaveBeenCalledWith(1);
		expect(await readFile(file, 'utf8')).toBe(UNFORMATTED);
	});

	it('writes fixes and still exits 1 on drift with --write', async () => {
		const file = join(dir, 'dirty.nsi');
		await writeFile(file, UNFORMATTED);

		await buildRoot().parseAsync(['check', '--write', file], { from: 'user' });

		expect(exit).toHaveBeenCalledWith(1);
		expect(await readFile(file, 'utf8')).toBe(FORMATTED);
	});

	it('exits 2 when no input files match', async () => {
		await buildRoot().parseAsync(['check', join(dir, '*.nope')], { from: 'user' });

		expect(exit).toHaveBeenCalledWith(2);
	});
});

describe('check stdin', () => {
	let exit: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.spyOn(logger, 'start').mockImplementation(() => undefined);
		vi.spyOn(logger, 'info').mockImplementation(() => undefined);
		vi.spyOn(logger, 'success').mockImplementation(() => undefined);
		vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		vi.spyOn(logger, 'error').mockImplementation(() => undefined);
		vi.spyOn(logger, 'debug').mockImplementation(() => undefined);
		exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as (code?: string | number | null) => never);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('exits 0 and logs "already formatted" for clean stdin', async () => {
		vi.spyOn(shared, 'hasStdin').mockReturnValue(true);
		vi.spyOn(shared, 'readStdin').mockResolvedValue(FORMATTED);

		await buildRoot().parseAsync(['check'], { from: 'user' });

		expect(exit).not.toHaveBeenCalled();
		expect(logger.start).toHaveBeenCalledWith('Checking standard input...');
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('already formatted'));
		expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('Completed in'));
	});

	it('exits 1 and logs "has issues" on drift from stdin', async () => {
		vi.spyOn(shared, 'hasStdin').mockReturnValue(true);
		vi.spyOn(shared, 'readStdin').mockResolvedValue(UNFORMATTED);

		await buildRoot().parseAsync(['check'], { from: 'user' });

		expect(exit).toHaveBeenCalledWith(1);
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('has issues'));
		expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('Completed in'));
	});

	it('warns that --write is ignored with stdin', async () => {
		vi.spyOn(shared, 'hasStdin').mockReturnValue(true);
		vi.spyOn(shared, 'readStdin').mockResolvedValue(FORMATTED);

		await buildRoot().parseAsync(['check', '--write'], { from: 'user' });

		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('--write'));
	});
});
