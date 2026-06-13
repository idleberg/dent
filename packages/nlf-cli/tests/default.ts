import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { globSync } from 'glob';
import { test } from 'uvu';
import * as assert from 'uvu/assert';

const cli = resolve(process.cwd(), 'src/cli.ts');
const files = globSync(resolve(process.cwd(), 'tests/fixtures/*.nlf'));

for (const file of files) {
	const fileDir = dirname(file);
	const fileBase = basename(file, '.nlf');
	const jsonFile = join(fileDir, `${fileBase}.json`);

	test(`NLF: ${basename(file)}`, () => {
		const actual = JSON.parse(spawnSync('node', [cli, '--stdout', '--no-lines', file]).stdout.toString());
		const expected = JSON.parse(readFileSync(jsonFile, 'utf8'));

		assert.equal(actual, expected);
	});

	test(`NLF: ${basename(file)} (CRLF)`, () => {
		const actual = spawnSync('node', [cli, '--stdout', '--no-lines', '--eol crlf', file]).stdout.toString();

		assert.is(actual.split('\r\n').length, actual.split('\n').length);
	});

	test(`NLF: ${basename(file)} (LF)`, () => {
		const actual = spawnSync('node', [cli, '--stdout', '--no-lines', '--eol lf', file]).stdout.toString();

		assert.equal(actual.split('\r\n'), [actual]);
	});
}

test.run();
