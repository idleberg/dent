/** biome-ignore-all lint/suspicious/noTemplateCurlyInString: NSIS definitions */
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import type { CommentNode, CSTNode, InstructionNode, LabelNode } from '../src/parser.js';
import { parse } from '../src/parser.js';

// --- Smoke tests: parse fixtures without throwing ---

test('Parses indentation fixture', async () => {
	const input = await fs.readFile(resolve(process.cwd(), 'tests/fixtures/indentation.nsi'), 'utf8');
	const nodes = parse(input);
	assert.ok(Array.isArray(nodes));
	assert.ok(nodes.length > 0);
});

test('Parses empty-lines fixture', async () => {
	const input = await fs.readFile(resolve(process.cwd(), 'tests/fixtures/empty-lines.nsi'), 'utf8');
	const nodes = parse(input);
	assert.ok(Array.isArray(nodes));
	assert.ok(nodes.length > 0);
});

// --- Blank lines ---

test('Blank lines produce blank nodes', () => {
	const nodes = parse('\n\n');
	assert.is(nodes.length, 2);
	assert.is((nodes[0] as CSTNode).type, 'blank');
	assert.is((nodes[1] as CSTNode).type, 'blank');
});

test('Trailing whitespace at EOF is a blank node', () => {
	const nodes = parse('FunctionEnd\n    ');
	assert.is(nodes.length, 2);
	assert.is((nodes[0] as InstructionNode).type, 'instruction');
	assert.is((nodes[0] as InstructionNode).keyword, 'FunctionEnd');
	assert.is((nodes[1] as CSTNode).type, 'blank');
});

// --- Comments ---

test('Hash comment', () => {
	const node = parse('# This is a comment\n')[0] as CommentNode;
	assert.is(node.type, 'comment');
	assert.is(node.style, 'hash');
	assert.is(node.value, 'This is a comment');
});

test('Semicolon comment', () => {
	const node = parse('; This is a comment\n')[0] as CommentNode;
	assert.is(node.type, 'comment');
	assert.is(node.style, 'semicolon');
	assert.is(node.value, 'This is a comment');
});

// --- Compiler commands ---

test('Compiler command with quoted arg', () => {
	const node = parse('!include "LogicLib.nsh"\n')[0] as InstructionNode;
	assert.is(node.type, 'instruction');
	assert.is(node.keyword, '!include');
	assert.equal(node.args, ['"LogicLib.nsh"']);
});

test('Compiler command conditional', () => {
	const node = parse('!if "true" == "true"\n')[0] as InstructionNode;
	assert.is(node.keyword, '!if');
	assert.equal(node.args, ['"true"', '==', '"true"']);
});

// --- LogicLib macros ---

test('LogicLib macro keyword', () => {
	const node = parse('${If} "true" == "true"\n')[0] as InstructionNode;
	assert.is(node.type, 'instruction');
	assert.is(node.keyword, '${If}');
	assert.equal(node.args, ['"true"', '==', '"true"']);
});

test('LogicLib macro without args', () => {
	const node = parse('${EndIf}\n')[0] as InstructionNode;
	assert.is(node.keyword, '${EndIf}');
	assert.equal(node.args, []);
});

// --- Regular instructions ---

test('Instruction with quoted arg', () => {
	const node = parse('Name "demo"\n')[0] as InstructionNode;
	assert.is(node.type, 'instruction');
	assert.is(node.keyword, 'Name');
	assert.equal(node.args, ['"demo"']);
});

test('Instruction with no args', () => {
	const node = parse('Nop\n')[0] as InstructionNode;
	assert.is(node.keyword, 'Nop');
	assert.equal(node.args, []);
});

test('Instruction with multiple args', () => {
	const node = parse('MessageBox MB_OK "Hello World"\n')[0] as InstructionNode;
	assert.is(node.keyword, 'MessageBox');
	assert.equal(node.args, ['MB_OK', '"Hello World"']);
});

// --- Trailing comments ---

test('Instruction with trailing semicolon comment', () => {
	const node = parse('Nop ; do nothing\n')[0] as InstructionNode;
	assert.is(node.type, 'instruction');
	assert.ok(node.comment);
	assert.is(node.comment?.style, 'semicolon');
	assert.is(node.comment?.value, 'do nothing');
});

test('Instruction with trailing hash comment', () => {
	const node = parse('Nop # do nothing\n')[0] as InstructionNode;
	assert.ok(node.comment);
	assert.is(node.comment?.style, 'hash');
	assert.is(node.comment?.value, 'do nothing');
});

// --- Casing preservation ---

test('Keyword casing is preserved', () => {
	const node = parse('SECTION "test"\n')[0] as InstructionNode;
	assert.is(node.keyword, 'SECTION');
});

// --- Whitespace normalization ---

test('Leading whitespace is stripped from parsed keyword', () => {
	const node = parse('    Name "demo"\n')[0] as InstructionNode;
	assert.is(node.keyword, 'Name');
	assert.equal(node.args, ['"demo"']);
});

test('Multiple spaces between args are not in parsed tokens', () => {
	const node = parse('MessageBox    MB_OK    "Hello"\n')[0] as InstructionNode;
	assert.equal(node.args, ['MB_OK', '"Hello"']);
});

// --- Edge cases ---

test('File without trailing newline', () => {
	const nodes = parse('Nop');
	assert.is(nodes.length, 1);
	assert.is((nodes[0] as InstructionNode).keyword, 'Nop');
});

test('Dot-prefixed function name', () => {
	const node = parse('Function .onInit\n')[0] as InstructionNode;
	assert.is(node.keyword, 'Function');
	assert.equal(node.args, ['.onInit']);
});

test('Variable as argument', () => {
	const node = parse('${For} $0 1 5\n')[0] as InstructionNode;
	assert.is(node.keyword, '${For}');
	assert.equal(node.args, ['$0', '1', '5']);
});

test('Path with backslash in quoted string', () => {
	const node = parse('InstallDir "$PROGRAMFILES\\Demo"\n')[0] as InstructionNode;
	assert.is(node.keyword, 'InstallDir');
	assert.equal(node.args, ['"$PROGRAMFILES\\Demo"']);
});

test('Single-quoted string with escaped single quote', () => {
	const node = parse("DetailPrint 'Quote $\\'This$\\''\n")[0] as InstructionNode;
	assert.is(node.keyword, 'DetailPrint');
	assert.equal(node.args, ["'Quote $\\'This$\\''"]);
});

test('Backtick string with escaped backtick', () => {
	const node = parse('DetailPrint `Quote $\\`This$\\``\n')[0] as InstructionNode;
	assert.is(node.keyword, 'DetailPrint');
	assert.equal(node.args, ['`Quote $\\`This$\\``']);
});

// --- Unicode ---

test('Parses unicode fixture', async () => {
	const input = await fs.readFile(resolve(process.cwd(), 'tests/fixtures/unicode.nsi'), 'utf8');
	const nodes = parse(input);
	assert.ok(Array.isArray(nodes));
	assert.ok(nodes.length > 0);
});

test('Unicode strings preserved in arguments', () => {
	const node = parse('DetailPrint "שלום, עולם!"\n')[0] as InstructionNode;
	assert.is(node.type, 'instruction');
	assert.equal(node.args, ['"שלום, עולם!"']);
});

test('Multiple scripts in different languages', () => {
	const lines = [
		'DetailPrint "こんにちは、世界！"\n',
		'DetailPrint "привет, мир!"\n',
		'DetailPrint "안녕하세요!"\n',
		'DetailPrint "สวัสดีชาวโลก!"\n',
		'DetailPrint "Γεια σου, Κόσμε!"\n',
	];
	for (const line of lines) {
		const node = parse(line)[0] as InstructionNode;
		assert.is(node.type, 'instruction');
		assert.is(node.keyword, 'DetailPrint');
	}
});

test('BOM prefix is stripped', () => {
	const input = '﻿; BOM test\nDetailPrint "שלום"\n';
	const nodes = parse(input);
	assert.ok(nodes.length > 0);
	const instr = nodes.find((n: CSTNode) => (n as InstructionNode).type === 'instruction') as InstructionNode;
	assert.is(instr.keyword, 'DetailPrint');
	assert.equal(instr.args, ['"שלום"']);
});

// --- Strict keyword validation ---

test('Unknown keyword rejects', () => {
	assert.throws(() => parse('FooBar "arg"\n'));
});

test('Unknown compiler command rejects', () => {
	assert.throws(() => parse('!foobar "arg"\n'));
});

// --- Plugin calls ---

test('Plugin call keyword', () => {
	const node = parse('nsDialogs::Create /NOUNLOAD 1018\n')[0] as InstructionNode;
	assert.is(node.type, 'instruction');
	assert.is(node.keyword, 'nsDialogs::Create');
	assert.equal(node.args, ['/NOUNLOAD', '1018']);
});

test('Plugin call with underscore prefix after ::', () => {
	const node = parse('nsProcess::_FindProcess "foo.exe"\n')[0] as InstructionNode;
	assert.is(node.type, 'instruction');
	assert.is(node.keyword, 'nsProcess::_FindProcess');
	assert.equal(node.args, ['"foo.exe"']);
});

// --- Labels ---

test('Label line', () => {
	const node = parse('myLabel:\n')[0] as LabelNode;
	assert.is(node.type, 'label');
	assert.is(node.name, 'myLabel');
});

test('Label with trailing comment', () => {
	const node = parse('done: ; end of loop\n')[0] as LabelNode;
	assert.is(node.type, 'label');
	assert.is(node.name, 'done');
	assert.is(node.comment?.style, 'semicolon');
});

test('Label with instruction on same line', () => {
	const nodes = parse('Start: MessageBox MB_OK "Start:"\n');
	assert.is(nodes.length, 2);
	assert.is((nodes[0] as LabelNode).type, 'label');
	assert.is((nodes[0] as LabelNode).name, 'Start');
	assert.is((nodes[1] as InstructionNode).type, 'instruction');
	assert.is((nodes[1] as InstructionNode).keyword, 'MessageBox');
	assert.equal((nodes[1] as InstructionNode).args, ['MB_OK', '"Start:"']);
});

test('Macro keyword with underscores', () => {
	const node = parse('${__xpr} +2\n')[0] as InstructionNode;
	assert.is(node.type, 'instruction');
	assert.is(node.keyword, '${__xpr}');
	assert.equal(node.args, ['+2']);
});

test.run();
