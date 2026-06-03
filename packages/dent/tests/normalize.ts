/** biome-ignore-all lint/suspicious/noTemplateCurlyInString: NSIS definitions */
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import {
	joinInstructionArgs,
	joinWithCompactPipes,
	normalizeArg,
	normalizeInstructionArgs,
	normalizeQuotes,
	splitArithmeticTokens,
	splitPipeTokens,
} from '../src/normalize.js';

// --- normalizeQuotes ---

test('normalizeQuotes: double to double (no-op)', () => {
	assert.is(normalizeQuotes('"hello"', false), '"hello"');
});

test('normalizeQuotes: single to double', () => {
	assert.is(normalizeQuotes("'hello'", false), '"hello"');
});

test('normalizeQuotes: double to single', () => {
	assert.is(normalizeQuotes('"hello"', true), "'hello'");
});

test('normalizeQuotes: backtick to double', () => {
	assert.is(normalizeQuotes('`hello`', false), '"hello"');
});

test('normalizeQuotes: prefers target when content is clean', () => {
	assert.is(normalizeQuotes("'no special'", false), '"no special"');
});

test('normalizeQuotes: falls back to alt when target char is in content', () => {
	assert.is(normalizeQuotes('`she said "hi"`', false), '\'she said "hi"\'');
});

test('normalizeQuotes: falls back to backtick when both quote types present', () => {
	assert.is(normalizeQuotes(`"it's a "test""`, false), '`it\'s a "test"`');
});

test('normalizeQuotes: escapes for double when all quote types present', () => {
	const input = '`it\'s "a" `test``';
	const result = normalizeQuotes(input, false);
	assert.is(result[0], '"');
	assert.is(result[result.length - 1], '"');
});

test('normalizeQuotes: unescapes $\\" before re-quoting', () => {
	assert.is(normalizeQuotes('"say $\\"hi$\\""', true), '\'say "hi"\'');
});

test('normalizeQuotes: unescapes "" (doubled double) before re-quoting', () => {
	assert.is(normalizeQuotes('"say ""hi"""', true), '\'say "hi"\'');
});

test('normalizeQuotes: returns bare tokens unchanged', () => {
	assert.is(normalizeQuotes('MB_OK', false), 'MB_OK');
});

// --- normalizeArg ---

test('normalizeArg: $-prefixed args are untouched', () => {
	assert.is(normalizeArg('$INSTDIR', undefined, false), '$INSTDIR');
});

test('normalizeArg: quoted args go through normalizeQuotes', () => {
	assert.is(normalizeArg("'hello'", undefined, false), '"hello"');
});

test('normalizeArg: global parameter is canonicalised', () => {
	assert.is(normalizeArg('/silent', undefined, false), '/SILENT');
});

test('normalizeArg: instruction-specific parameter takes precedence', () => {
	const instrParams = new Map([['true', 'true']]);
	assert.is(normalizeArg('TRUE', instrParams, false), 'true');
});

test('normalizeArg: parameterised prefix is canonicalised', () => {
	assert.is(normalizeArg('/lang=1033', undefined, false), '/LANG=1033');
});

test('normalizeArg: unknown bare token is returned as-is', () => {
	assert.is(normalizeArg('SomeCustomThing', undefined, false), 'SomeCustomThing');
});

// --- splitPipeTokens ---

test('splitPipeTokens: splits MB_OK|MB_DEFBUTTON1', () => {
	assert.equal(splitPipeTokens(['MB_OK|MB_DEFBUTTON1']), ['MB_OK', '|', 'MB_DEFBUTTON1']);
});

test('splitPipeTokens: leading pipe', () => {
	assert.equal(splitPipeTokens(['|MB_DEFBUTTON1']), ['|', 'MB_DEFBUTTON1']);
});

test('splitPipeTokens: trailing pipe', () => {
	assert.equal(splitPipeTokens(['MB_OK|']), ['MB_OK', '|']);
});

test('splitPipeTokens: standalone pipe passes through', () => {
	assert.equal(splitPipeTokens(['|']), ['|']);
});

test('splitPipeTokens: no pipe passes through', () => {
	assert.equal(splitPipeTokens(['MB_OK', '"hello"']), ['MB_OK', '"hello"']);
});

test('splitPipeTokens: quoted strings are never split', () => {
	assert.equal(splitPipeTokens(['"a|b"']), ['"a|b"']);
});

test('splitPipeTokens: preserves ${...} groups across pipe', () => {
	assert.equal(splitPipeTokens(['${MB_OK}|${MB_DEFBUTTON1}']), ['${MB_OK}', '|', '${MB_DEFBUTTON1}']);
});

test('splitPipeTokens: $variable|$variable', () => {
	assert.equal(splitPipeTokens(['$1|$2']), ['$1', '|', '$2']);
});

// --- splitArithmeticTokens ---

test('splitArithmeticTokens: $1+$2', () => {
	assert.equal(splitArithmeticTokens(['$1+$2']), ['$1', '+', '$2']);
});

test('splitArithmeticTokens: $1-$2 (binary minus)', () => {
	assert.equal(splitArithmeticTokens(['$1-$2']), ['$1', '-', '$2']);
});

test('splitArithmeticTokens: $1+-$2 (unary minus after operator)', () => {
	assert.equal(splitArithmeticTokens(['$1+-$2']), ['$1', '+', '-$2']);
});

test('splitArithmeticTokens: leading unary minus', () => {
	assert.equal(splitArithmeticTokens(['-$1']), ['-$1']);
});

test('splitArithmeticTokens: multi-char operator ||', () => {
	assert.equal(splitArithmeticTokens(['$1||$2']), ['$1', '||', '$2']);
});

test('splitArithmeticTokens: multi-char operator <<', () => {
	assert.equal(splitArithmeticTokens(['$1<<$2']), ['$1', '<<', '$2']);
});

test('splitArithmeticTokens: three-char operator >>>', () => {
	assert.equal(splitArithmeticTokens(['$1>>>$2']), ['$1', '>>>', '$2']);
});

test('splitArithmeticTokens: standalone operator passes through', () => {
	assert.equal(splitArithmeticTokens(['+']), ['+']);
});

test('splitArithmeticTokens: quoted strings are never split', () => {
	assert.equal(splitArithmeticTokens(['"1+2"']), ['"1+2"']);
});

test('splitArithmeticTokens: preserves ${...} groups', () => {
	assert.equal(splitArithmeticTokens(['${a}+${b}']), ['${a}', '+', '${b}']);
});

// --- joinWithCompactPipes ---

test('joinWithCompactPipes: basic pipe join', () => {
	assert.is(joinWithCompactPipes(['MB_OK', '|', 'MB_DEFBUTTON1']), 'MB_OK|MB_DEFBUTTON1');
});

test('joinWithCompactPipes: pipe with trailing arg', () => {
	assert.is(joinWithCompactPipes(['MB_OK', '|', 'MB_DEFBUTTON1', '"Hello"']), 'MB_OK|MB_DEFBUTTON1 "Hello"');
});

test('joinWithCompactPipes: no pipes', () => {
	assert.is(joinWithCompactPipes(['"hello"', '$INSTDIR']), '"hello" $INSTDIR');
});

test('joinWithCompactPipes: leading pipe', () => {
	assert.is(joinWithCompactPipes(['|', 'MB_OK']), '|MB_OK');
});

// --- joinInstructionArgs ---

test('joinInstructionArgs: uses compact pipes for regular instructions', () => {
	assert.is(joinInstructionArgs(['MB_OK', '|', 'MB_DEFBUTTON1'], 'MessageBox'), 'MB_OK|MB_DEFBUTTON1');
});

test('joinInstructionArgs: uses spaces for IntOp', () => {
	assert.is(joinInstructionArgs(['$1', '+', '$2'], 'IntOp'), '$1 + $2');
});

test('joinInstructionArgs: uses spaces for IntPtrOp', () => {
	assert.is(joinInstructionArgs(['$1', '-', '$2'], 'IntPtrOp'), '$1 - $2');
});

// --- normalizeInstructionArgs (integration) ---

test('normalizeInstructionArgs: splits pipes and normalises args', () => {
	const result = normalizeInstructionArgs(['MB_OK|MB_DEFBUTTON1', '/silent'], 'MessageBox', false);
	assert.equal(result, ['MB_OK', '|', 'MB_DEFBUTTON1', '/SILENT']);
});

test('normalizeInstructionArgs: splits arithmetic for IntOp', () => {
	const result = normalizeInstructionArgs(['$1+$2'], 'IntOp', false);
	assert.equal(result, ['$1', '+', '$2']);
});

test('normalizeInstructionArgs: normalises quotes', () => {
	const result = normalizeInstructionArgs(["'hello'"], 'Name', false);
	assert.equal(result, ['"hello"']);
});

test('normalizeInstructionArgs: preserves $-prefixed args', () => {
	const result = normalizeInstructionArgs(['$INSTDIR'], 'SetOutPath', false);
	assert.equal(result, ['$INSTDIR']);
});

test.run();
