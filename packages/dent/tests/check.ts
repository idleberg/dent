import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { createFormatter } from '../src/dent.js';

// --- Already-formatted input returns null ---

test('Returns null for already tab-indented content', async () => {
	const { check } = createFormatter();

	const expected = await fs.readFile(resolve(process.cwd(), 'tests/expected/tab-indentation.nsi'), 'utf8');

	assert.is(check(expected), null);
});

test('Returns null for already space-indented content', async () => {
	const { check } = createFormatter({
		useTabs: false,
	});

	const expected = await fs.readFile(resolve(process.cwd(), 'tests/expected/space-indentation.nsi'), 'utf8');

	assert.is(check(expected), null);
});

test('Returns null for already trimmed empty lines', async () => {
	const { check } = createFormatter();

	const expected = await fs.readFile(resolve(process.cwd(), 'tests/expected/empty-lines.nsi'), 'utf8');

	assert.is(check(expected), null);
});

test('Returns null for already formatted quotes', async () => {
	const { check } = createFormatter();

	const expected = await fs.readFile(resolve(process.cwd(), 'tests/expected/quotes.nsi'), 'utf8');

	assert.is(check(expected), null);
});

// --- Unformatted input returns formatted string ---

test('Returns formatted string for unformatted indentation', async () => {
	const { check } = createFormatter();

	const fixture = await fs.readFile(resolve(process.cwd(), 'tests/fixtures/indentation.nsi'), 'utf8');
	const expected = await fs.readFile(resolve(process.cwd(), 'tests/expected/tab-indentation.nsi'), 'utf8');

	assert.is(check(fixture), expected);
});

test('Returns formatted string when useTabs is false', async () => {
	const { check } = createFormatter({
		useTabs: false,
	});

	const fixture = await fs.readFile(resolve(process.cwd(), 'tests/fixtures/indentation.nsi'), 'utf8');
	const expected = await fs.readFile(resolve(process.cwd(), 'tests/expected/space-indentation.nsi'), 'utf8');

	assert.is(check(fixture), expected);
});

test('Returns formatted string for excess empty lines', async () => {
	const { check } = createFormatter();

	const fixture = await fs.readFile(resolve(process.cwd(), 'tests/fixtures/empty-lines.nsi'), 'utf8');
	const expected = await fs.readFile(resolve(process.cwd(), 'tests/expected/empty-lines.nsi'), 'utf8');

	assert.is(check(fixture), expected);
});

test('Returns formatted string for unformatted quotes', async () => {
	const { check } = createFormatter();

	const fixture = await fs.readFile(resolve(process.cwd(), 'tests/fixtures/quotes.nsi'), 'utf8');
	const expected = await fs.readFile(resolve(process.cwd(), 'tests/expected/quotes.nsi'), 'utf8');

	assert.is(check(fixture), expected);
});

// --- Inline cases ---

test('Returns null for canonical-cased instruction', () => {
	const { check } = createFormatter();
	assert.is(check('Name "demo"\n'), null);
});

test('Returns formatted string for non-canonical casing', () => {
	const { check } = createFormatter();
	assert.is(check('name "demo"\n'), 'Name "demo"\n');
});

test('Returns formatted string when indentation differs', () => {
	const { check } = createFormatter({ useTabs: false, indentSize: 2 });
	const input = 'Function .onInit\n\tNop\nFunctionEnd\n';
	const expected = 'Function .onInit\n  Nop\nFunctionEnd\n';
	assert.is(check(input), expected);
});

test.run();
