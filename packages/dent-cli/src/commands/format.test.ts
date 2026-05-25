import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../log.js';
import { formatCommand } from './format.js';
import * as shared from './shared.js';

const UNFORMATTED = 'Section "demo"\n  DetailPrint "x"\nSectionEnd\n';
const FORMATTED = 'Section "demo"\n\tDetailPrint "x"\nSectionEnd\n';

function buildRoot() {
	return new Command('dent').exitOverride().option('-D, --debug', '', false).addCommand(formatCommand());
}

describe('formatCommand shape', () => {
	it('is named "format" with the expected description', () => {
		const cmd = formatCommand();
		expect(cmd.name()).toBe('format');
		expect(cmd.description().toLowerCase()).toContain('format');
	});

	it('exposes formatting options plus --write', () => {
		const longs = formatCommand().options.map((opt) => opt.long);
		expect(longs).toEqual(expect.arrayContaining(['--eol', '--indent-size', '--use-spaces', '--no-trim', '--write']));
	});
});

describe('format action', () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'dent-format-'));
		vi.spyOn(logger, 'start').mockImplementation(() => undefined);
		vi.spyOn(logger, 'info').mockImplementation(() => undefined);
		vi.spyOn(logger, 'success').mockImplementation(() => undefined);
		vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		vi.spyOn(logger, 'error').mockImplementation(() => undefined);
		vi.spyOn(logger, 'debug').mockImplementation(() => undefined);
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
		vi.restoreAllMocks();
	});

	it('writes the formatted contents to stdout when --write is omitted', async () => {
		const file = join(dir, 'a.nsi');
		await writeFile(file, UNFORMATTED);

		const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
		await buildRoot().parseAsync(['format', file], { from: 'user' });

		expect(stdout).toHaveBeenCalled();
		const written = stdout.mock.calls.map((call) => call[0]).join('');
		expect(written).toBe(FORMATTED);

		const onDisk = await readFile(file, 'utf8');
		expect(onDisk).toBe(UNFORMATTED);
	});

	it('writes the formatted contents to disk with --write', async () => {
		const file = join(dir, 'a.nsi');
		await writeFile(file, UNFORMATTED);

		await buildRoot().parseAsync(['format', '--write', file], { from: 'user' });

		expect(await readFile(file, 'utf8')).toBe(FORMATTED);
	});

	it('skips writing when the file is already formatted (short-circuit via check)', async () => {
		const file = join(dir, 'a.nsi');
		await writeFile(file, FORMATTED);

		await buildRoot().parseAsync(['format', '--write', file], { from: 'user' });

		const messages = (logger.info as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
		expect(messages.some((m) => typeof m === 'string' && m.includes('already formatted'))).toBe(true);
	});

	it('exits with code 1 when no input files match', async () => {
		const exit = vi
			.spyOn(process, 'exit')
			.mockImplementation((() => undefined) as (code?: string | number | null) => never);

		await buildRoot().parseAsync(['format', join(dir, '*.nope')], { from: 'user' });

		expect(exit).toHaveBeenCalledWith(1);
	});
});

describe('format stdin', () => {
	beforeEach(() => {
		vi.spyOn(logger, 'start').mockImplementation(() => undefined);
		vi.spyOn(logger, 'info').mockImplementation(() => undefined);
		vi.spyOn(logger, 'success').mockImplementation(() => undefined);
		vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		vi.spyOn(logger, 'error').mockImplementation(() => undefined);
		vi.spyOn(logger, 'debug').mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('formats stdin content to stdout when no files are given', async () => {
		vi.spyOn(shared, 'hasStdin').mockReturnValue(true);
		vi.spyOn(shared, 'readStdin').mockResolvedValue(UNFORMATTED);
		const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

		await buildRoot().parseAsync(['format'], { from: 'user' });

		const written = stdout.mock.calls.map((call) => call[0]).join('');
		expect(written).toBe(FORMATTED);
	});

	it('passes through already-formatted stdin unchanged', async () => {
		vi.spyOn(shared, 'hasStdin').mockReturnValue(true);
		vi.spyOn(shared, 'readStdin').mockResolvedValue(FORMATTED);
		const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

		await buildRoot().parseAsync(['format'], { from: 'user' });

		const written = stdout.mock.calls.map((call) => call[0]).join('');
		expect(written).toBe(FORMATTED);
	});
});
