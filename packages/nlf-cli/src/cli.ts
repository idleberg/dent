#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as NLF from '@nsis/nlf';
import { type OptionValues, program } from 'commander';
import getStdin from 'get-stdin';
import symbols from 'log-symbols';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { version } = JSON.parse(await fs.readFile(resolve(__dirname, '../package.json'), 'utf8'));

// Action
program
	.version(version)
	.description('CLI tool to convert NSIS Language Files to JSON and vice versa')
	.arguments('<file...>')
	.usage('[options] <file...>')
	.option(
		'-e, --eol <"crlf"|"lf">',
		'select end of line sequence',
		(value) => ['crlf', 'lf'].includes(value),
		undefined,
	)
	.option('-m, --minify', 'minify output JSON', false)
	.option('-l, --no-lines', 'suppress line-numbers in stdout', true)
	.option('-o, --output <dir>', 'set the output directory')
	.option('-s, --stdout', 'print result to stdout', false)
	.parse(process.argv);

const options = program.opts();

(async () => {
	const stdIn = await getStdin();

	if (program.args.length > 0) {
		await fileMode(program.args, options);
	} else if (stdIn.length > 0) {
		await streamMode(stdIn, options);
	} else {
		program.help();
	}
})();

async function fileMode(args: string[], options: OptionValues) {
	let contents: string;
	let output: string;

	args.map(async (input: string) => {
		try {
			contents = await fs.readFile(input, 'utf8');
		} catch {
			console.warn(`${symbols.warning} ${input} not found`);
			return;
		}

		if (input.endsWith('.nlf')) {
			try {
				output = stringify(contents, options.minify);
				await printResult(input, output, 'json');
			} catch {
				console.error(`${symbols.error} ${input} failed`);
			}
		} else if (input.endsWith('.json')) {
			try {
				output = NLF.stringify(contents);
				await printResult(input, output, 'nlf');
			} catch {
				console.error(`${symbols.error} ${input} failed`);
			}
		} else {
			console.warn(`${symbols.warning} ${input} skipped`);
		}
	});
}

async function streamMode(input: string, options: OptionValues) {
	try {
		JSON.parse(input);

		const output = NLF.stringify(input);
		await printResult(input, output);
	} catch (err) {
		if (err instanceof SyntaxError) {
			const output = stringify(input, options.minify);
			await printResult(input, output);
		} else {
			console.error(err);
		}
	}
}

async function printResult(input: string, output: string, extension = 'json') {
	let outputFile: string;
	let outputPath: string;

	if (options.stdout) {
		console.log(output);
	} else {
		outputFile = setOutName(input, `.${extension}`);
		outputPath = options.output ? join(options.output, outputFile) : outputFile;
		await fs.writeFile(outputPath, output);
		console.log(`${symbols.success} ${input} → ${outputPath}`);
	}
}

function setOutName(file: string, extName: string) {
	return basename(file, extname(file)) + extName;
}

function stringify(contents: string, minify: boolean) {
	return JSON.stringify(NLF.parse(contents), null, minify ? 0 : 2);
}
