import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { createFormatter } from '../src/dent.ts';

test('Tab indentation', async () => {
	const { format } = createFormatter();

	const fixture = await fs.readFile(resolve(process.cwd(), 'tests/fixtures/indentation.nsi'), 'utf8');

	const expected = await fs.readFile(resolve(process.cwd(), 'tests/expected/tab-indentation.nsi'), 'utf8');

	assert.is(format(fixture), expected);
});

test('Explicit tab indentation', async () => {
	const { format } = createFormatter({
		useTabs: true,
	});

	const fixture = await fs.readFile(resolve(process.cwd(), 'tests/fixtures/indentation.nsi'), 'utf8');

	const expected = await fs.readFile(resolve(process.cwd(), 'tests/expected/tab-indentation.nsi'), 'utf8');

	assert.is(format(fixture), expected);
});

test('Space indentation', async () => {
	const { format } = createFormatter({
		useTabs: false,
	});

	const fixture = await fs.readFile(resolve(process.cwd(), 'tests/fixtures/indentation.nsi'), 'utf8');

	const expected = await fs.readFile(resolve(process.cwd(), 'tests/expected/space-indentation.nsi'), 'utf8');

	assert.is(format(fixture), expected);
});

test('Empty lines', async () => {
	const { format } = createFormatter();

	const fixture = await fs.readFile(resolve(process.cwd(), 'tests/fixtures/empty-lines.nsi'), 'utf8');

	const expected = await fs.readFile(resolve(process.cwd(), 'tests/expected/empty-lines.nsi'), 'utf8');

	assert.is(format(fixture), expected);
});

test('Explicit empty lines', async () => {
	const { format } = createFormatter({
		trimEmptyLines: true,
	});

	const fixture = await fs.readFile(resolve(process.cwd(), 'tests/fixtures/empty-lines.nsi'), 'utf8');

	const expected = await fs.readFile(resolve(process.cwd(), 'tests/expected/empty-lines.nsi'), 'utf8');

	assert.is(format(fixture), expected);
});

test.run();
