import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleCLI } from './cli.js';
import { logger } from './log.js';

describe('handleCLI', () => {
	const originalArgv = process.argv;

	beforeEach(() => {
		vi.spyOn(logger, 'log').mockImplementation(() => undefined);
		vi.spyOn(logger, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		process.argv = originalArgv;
		vi.restoreAllMocks();
	});

	it('prints help and returns when invoked with no arguments', async () => {
		process.argv = ['node', '/path/to/cli.mjs'];
		const log = vi.spyOn(logger, 'log');

		await handleCLI();

		const output = log.mock.calls.map((call) => String(call[0])).join('\n');
		expect(output).toContain('Usage: dent');
		expect(output).toContain('format');
		expect(output).toContain('check');
	});
});
