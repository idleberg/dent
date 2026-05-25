import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fileExists, getVersion } from './utils.js';

describe('fileExists', () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'dent-utils-'));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it('returns true for an existing file', async () => {
		const file = join(dir, 'present.txt');
		await writeFile(file, 'hi');
		expect(await fileExists(file)).toBe(true);
	});

	it('returns false for a missing file', async () => {
		expect(await fileExists(join(dir, 'absent.txt'))).toBe(false);
	});
});

describe('getVersion', () => {
	it('returns a semver string from package.json', async () => {
		const version = await getVersion();
		expect(version).toMatch(/^\d+\.\d+\.\d+/);
	});
});
