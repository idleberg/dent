import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../log.js';
import { applyFormattingOptions, defaultLineEndings, warnFormattingOptions } from './options.js';

describe('applyFormattingOptions', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('registers the four formatting options', () => {
		const cmd = applyFormattingOptions(new Command('test').exitOverride());
		const longs = cmd.options.map((opt) => opt.long);

		expect(longs).toEqual(expect.arrayContaining(['--eol', '--indent-size', '--use-spaces', '--no-trim']));
	});

	it('applies sensible defaults when no flags are passed', () => {
		const cmd = applyFormattingOptions(new Command('test').exitOverride());
		cmd.parse([], { from: 'user' });

		expect(cmd.opts()).toMatchObject({
			eol: defaultLineEndings,
			indentSize: 2,
			useSpaces: false,
			trim: true,
		});
	});

	it('parses --indent-size as an integer', () => {
		const cmd = applyFormattingOptions(new Command('test').exitOverride());
		cmd.parse(['--indent-size', '4'], { from: 'user' });

		expect(cmd.opts().indentSize).toBe(4);
	});

	it('accepts --eol crlf and --eol lf', () => {
		const lf = applyFormattingOptions(new Command('test').exitOverride());
		lf.parse(['--eol', 'lf'], { from: 'user' });
		expect(lf.opts().eol).toBe('lf');

		const crlf = applyFormattingOptions(new Command('test').exitOverride());
		crlf.parse(['--eol', 'crlf'], { from: 'user' });
		expect(crlf.opts().eol).toBe('crlf');
	});

	it('falls back to the platform default when --eol value is invalid', () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		const cmd = applyFormattingOptions(new Command('test').exitOverride());
		cmd.parse(['--eol', 'mac'], { from: 'user' });

		expect(cmd.opts().eol).toBe(defaultLineEndings);
		expect(warn).toHaveBeenCalledOnce();
	});
});

describe('warnFormattingOptions', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('warns when indent-size is non-default but use-spaces is off', () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		warnFormattingOptions({ eol: 'lf', indentSize: 4, useSpaces: false, trim: true });

		expect(warn).toHaveBeenCalledOnce();
		expect(warn.mock.calls[0]?.[0]).toContain('indent-size');
	});

	it('does not warn when use-spaces is on', () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		warnFormattingOptions({ eol: 'lf', indentSize: 4, useSpaces: true, trim: true });

		expect(warn).not.toHaveBeenCalled();
	});

	it('does not warn when indent-size is the default', () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		warnFormattingOptions({ eol: 'lf', indentSize: 2, useSpaces: false, trim: true });

		expect(warn).not.toHaveBeenCalled();
	});
});
