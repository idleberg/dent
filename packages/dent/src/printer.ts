import { canonicalCasing } from './canonical-casing.ts';
import { canonicalIncludes } from './canonical-includes.ts';
import { globalParameterPrefixes, globalParameters, instructionParameters } from './canonical-parameters.ts';
import type { Comment, CommentNode, CSTNode, InstructionNode, LabelNode } from './parser.ts';
import { rules } from './rules.ts';

export interface PrinterOptions {
	useTabs: boolean;
	indentSize: number;
	printWidth: number;
	singleQuote: boolean;
	trimEmptyLines: boolean;
	eol: string;
}

/**
 * Renders a flat list of CST nodes back into formatted NSIS source text.
 *
 * Applies canonical keyword casing, whitespace normalisation,
 * blank-line collapsing, and stack-based indentation.
 */
export function print(nodes: CSTNode[], options: PrinterOptions): string {
	let level = 0;

	/**
	 * Stack of saved indent levels — pushed by every `open` keyword,
	 * popped by every `close` keyword. This makes nested blocks
	 * (including `${Switch}` inside `${Switch}`) work automatically
	 * without ad-hoc saved-level variables.
	 */
	const stack: number[] = [];

	const lines: string[] = [];
	let processed = ensureBlankAroundBlocks(nodes);
	if (options.trimEmptyLines) {
		processed = trimAndCollapseBlanks(processed);
	}

	for (const node of processed) {
		switch (node.type) {
			case 'blank':
				lines.push('');
				break;

			case 'comment':
				lines.push(printComment(node, level, options));
				break;

			case 'label':
				lines.push(printLabel(node, level, options));
				break;

			case 'instruction': {
				const kw = node.keyword.toLowerCase();

				if (rules.open.has(kw)) {
					// Print at current level, then push & indent
					lines.push(printInstruction(node, level, options));
					stack.push(level);
					level++;
				} else if (rules.case.has(kw)) {
					// Print one level inside parent, indent body one further
					const parentLevel = stack.length > 0 ? (stack[stack.length - 1] as number) : 0;
					const caseLevel = parentLevel + 1;
					lines.push(printInstruction(node, caseLevel, options));
					level = caseLevel + 1;
				} else if (rules.close.has(kw)) {
					// Pop to the opener's level, then print
					level = stack.length > 0 ? (stack.pop() as number) : 0;
					lines.push(printInstruction(node, level, options));
				} else if (rules.mid.has(kw)) {
					// Print at the opener's level (one back), keep depth the same
					const openerLevel = stack.length > 0 ? (stack[stack.length - 1] as number) : 0;
					lines.push(printInstruction(node, openerLevel, options));
				} else if (rules.closeAfter.has(kw)) {
					// Print at current level, then reset to parent's content level
					lines.push(printInstruction(node, level, options));
					level = (stack.length > 0 ? (stack[stack.length - 1] as number) : 0) + 1;
				} else {
					lines.push(printInstruction(node, level, options));
				}
				break;
			}
		}
	}

	return lines.join(options.eol) + options.eol;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function indentStr(level: number, options: PrinterOptions): string {
	const char = options.useTabs ? '\t' : ' '.repeat(options.indentSize);
	return char.repeat(level);
}

function printComment(node: CommentNode, level: number, options: PrinterOptions): string {
	const prefix = indentStr(level, options);

	if (node.style === 'block') {
		const lines = node.value.split(/\r?\n/);

		if (lines.length === 1) {
			return `${prefix}/*${node.value}*/`;
		}

		return lines
			.map((line, i) => {
				if (i === 0) return `${prefix}/*${line}`;
				const stripped = line.trimStart();
				if (i === lines.length - 1) return `${prefix} ${stripped}*/`;
				return `${prefix} ${stripped}`;
			})
			.join(options.eol);
	}

	const marker = node.style === 'hash' ? '#' : ';';
	return `${prefix}${marker} ${node.value}`;
}

function printLabel(node: LabelNode, level: number, options: PrinterOptions): string {
	let line = `${indentStr(level, options)}${node.name}:`;

	if (node.comment) {
		line += ` ${printTrailingComment(node.comment)}`;
	}

	return line;
}

function stripQuoteDelimiters(arg: string): [string, string] | undefined {
	const delim = arg[0];
	if (delim === '"' || delim === "'" || delim === '`') {
		return [delim, arg.slice(1, -1)];
	}
	return undefined;
}

function unescapeInner(inner: string): string {
	return inner.replaceAll('$\\"', '"').replaceAll('""', '"').replaceAll("$\\'", "'").replaceAll('$\\`', '`');
}

function escapeForDouble(inner: string): string {
	return inner.replaceAll('"', '$\\"');
}

function normalizeQuotes(arg: string, singleQuote: boolean): string {
	const stripped = stripQuoteDelimiters(arg);
	if (!stripped) return arg;

	const [, inner] = stripped;
	const target = singleQuote ? "'" : '"';
	const content = unescapeInner(inner);

	const hasDouble = content.includes('"');
	const hasSingle = content.includes("'");
	const hasBacktick = content.includes('`');

	if (!hasDouble && !hasSingle) {
		return target === '"' ? `"${content}"` : `'${content}'`;
	}

	const hasTarget = target === '"' ? hasDouble : hasSingle;

	if (!hasTarget) {
		return target === '"' ? `"${content}"` : `'${content}'`;
	}

	const alt = target === '"' ? "'" : '"';
	const hasAlt = alt === '"' ? hasDouble : hasSingle;

	if (!hasAlt) {
		return alt === '"' ? `"${content}"` : `'${content}'`;
	}

	if (!hasBacktick) {
		return `\`${content}\``;
	}

	return `"${escapeForDouble(content)}"`;
}

function normalizeArg(arg: string, instrParams: ReadonlyMap<string, string> | undefined, singleQuote: boolean): string {
	if (arg.startsWith('$')) {
		return arg;
	}
	if (arg.startsWith('"') || arg.startsWith("'") || arg.startsWith('`')) {
		return normalizeQuotes(arg, singleQuote);
	}

	const lower = arg.toLowerCase();

	// Exact match — check instruction-specific params first, then global
	const exact = instrParams?.get(lower) ?? globalParameters.get(lower);
	if (exact !== undefined) return exact;

	// Parameterised prefix (e.g. /LANG=1033, /CHARSET=UTF8)
	const eqIdx = arg.indexOf('=');
	if (eqIdx > 0) {
		const prefixLower = `${lower.slice(0, eqIdx + 1)}`;
		const canonical = globalParameterPrefixes.get(prefixLower);
		if (canonical !== undefined) {
			return `${canonical}${arg.slice(eqIdx + 1)}`;
		}
	}

	return arg;
}

/**
 * Splits bare tokens that contain pipes into separate tokens with `|` as
 * a standalone separator. Handles all spacing variants:
 * - `MB_OK|MB_DEFBUTTON1` → `['MB_OK', '|', 'MB_DEFBUTTON1']`
 * - `|MB_DEFBUTTON1`      → `['|', 'MB_DEFBUTTON1']`
 * - `MB_OK|`              → `['MB_OK', '|']`
 * - `$1|$2`               → `['$1', '|', '$2']`
 *
 * Quoted strings are never split. `${…}` groups within tokens are preserved.
 */
function splitPipeTokens(args: string[]): string[] {
	return args.flatMap((arg) => {
		if (arg.startsWith('"') || arg.startsWith("'") || arg.startsWith('`')) {
			return [arg];
		}
		if (!arg.includes('|') || arg === '|') {
			return [arg];
		}
		return splitPreservingGroups(arg, '|');
	});
}

/**
 * Splits a bare token on a single separator character, preserving `${…}`
 * groups (the separator inside braces is not treated as a split point).
 */
function splitPreservingGroups(arg: string, sep: string): string[] {
	const result: string[] = [];
	let current = '';
	let i = 0;

	while (i < arg.length) {
		// Preserve ${…} groups
		if (arg[i] === '$' && arg[i + 1] === '{') {
			const end = arg.indexOf('}', i + 2);
			if (end !== -1) {
				current += arg.slice(i, end + 1);
				i = end + 1;
				continue;
			}
		}

		if (arg[i] === sep) {
			if (current) result.push(current);
			current = '';
			result.push(sep);
			i++;
			continue;
		}

		current += arg[i];
		i++;
	}

	if (current) result.push(current);
	return result;
}

/**
 * Instructions whose arguments may contain arithmetic/bitwise operators
 * that should be split into separate tokens.
 */
const arithmeticInstructions = new Set(['intop', 'intptrop']);

/**
 * Splits bare tokens on arithmetic/bitwise operators for IntOp/IntPtrOp.
 * Handles both single-char (`+`, `-`, `*`, `/`, `%`, `&`, `^`, `~`, `!`)
 * and multi-char (`||`, `&&`, `<<`, `>>`) operators.
 *
 * Special handling for `-`: treated as unary (stays attached to the next
 * token) when it follows another operator or appears at the start.
 * - `$1+$2`   → `['$1', '+', '$2']`
 * - `$1+-$2`  → `['$1', '+', '-$2']`
 * - `$1-$2`   → `['$1', '-', '$2']`
 */
function splitArithmeticTokens(args: string[]): string[] {
	return args.flatMap((arg) => {
		if (arg.startsWith('"') || arg.startsWith("'") || arg.startsWith('`')) {
			return [arg];
		}
		// Already a standalone operator — pass through
		if (ARITHMETIC_OPS.has(arg)) {
			return [arg];
		}
		return tokenizeArithmetic(arg);
	});
}

const ARITHMETIC_OPS = new Set(['>>>', '||', '&&', '<<', '>>', '+', '-', '*', '/', '%', '|', '&', '^', '~', '!']);
const SINGLE_CHAR_OPS = new Set(['+', '-', '*', '/', '%', '|', '&', '^', '~', '!']);

function tokenizeArithmetic(arg: string): string[] {
	const result: string[] = [];
	let current = '';
	let lastWasOp = true; // start counts as "after operator" for unary detection
	let i = 0;

	while (i < arg.length) {
		// Preserve ${…} groups
		if (arg[i] === '$' && arg[i + 1] === '{') {
			const end = arg.indexOf('}', i + 2);
			if (end !== -1) {
				current += arg.slice(i, end + 1);
				i = end + 1;
				lastWasOp = false;
				continue;
			}
		}

		// Check three-char operators first
		if (i + 2 < arg.length) {
			const three = arg.slice(i, i + 3);
			if (ARITHMETIC_OPS.has(three)) {
				if (current) {
					result.push(current);
					current = '';
				}
				result.push(three);
				lastWasOp = true;
				i += 3;
				continue;
			}
		}

		// Check two-char operators
		if (i + 1 < arg.length) {
			const two = arg.slice(i, i + 2);
			if (ARITHMETIC_OPS.has(two)) {
				if (current) {
					result.push(current);
					current = '';
				}
				result.push(two);
				lastWasOp = true;
				i += 2;
				continue;
			}
		}

		// Check single-char operators
		const ch = arg[i] as string;
		if (SINGLE_CHAR_OPS.has(ch)) {
			// `-` after another operator (or at start) is unary — keep attached
			if (ch === '-' && lastWasOp) {
				current += ch;
				i++;
				continue;
			}
			if (current) {
				result.push(current);
				current = '';
			}
			result.push(ch);
			lastWasOp = true;
			i++;
			continue;
		}

		current += ch;
		lastWasOp = false;
		i++;
	}

	if (current) result.push(current);
	return result.length > 0 ? result : [arg];
}

/**
 * Joins args so that `|` tokens are compact (no surrounding spaces).
 * `['MB_OK', '|', 'MB_DEFBUTTON1', '"Hello"']` → `'MB_OK|MB_DEFBUTTON1 "Hello"'`
 */
function joinWithCompactPipes(args: string[]): string {
	let result = '';
	for (let i = 0; i < args.length; i++) {
		const arg = args[i] as string;
		if (arg === '|') {
			result += '|';
		} else if (i > 0 && args[i - 1] === '|') {
			result += arg;
		} else {
			if (result) result += ' ';
			result += arg;
		}
	}
	return result;
}

function printInstruction(node: InstructionNode, level: number, options: PrinterOptions): string {
	const kwLower = node.keyword.toLowerCase();
	const keyword = canonicalCasing.get(kwLower) ?? canonicalIncludes.get(kwLower) ?? node.keyword;
	const instrParams = instructionParameters.get(kwLower);
	const isArithmetic = arithmeticInstructions.has(kwLower);
	const splitArgs = isArithmetic ? splitArithmeticTokens(node.args) : splitPipeTokens(node.args);
	const args = splitArgs.map((arg) => normalizeArg(arg, instrParams, options.singleQuote));
	const indent = indentStr(level, options);

	if (options.printWidth > 0 && args.length > 0) {
		const trailing = node.comment ? printTrailingComment(node.comment) : undefined;
		return wrapInstruction(keyword, args, trailing, indent, isArithmetic, options);
	}

	const joined = isArithmetic ? args.join(' ') : joinWithCompactPipes(args);
	const parts = args.length > 0 ? `${keyword} ${joined}` : keyword;
	let line = `${indent}${parts}`;

	if (node.comment) {
		line += ` ${printTrailingComment(node.comment)}`;
	}

	return line;
}

function printTrailingComment(comment: Comment): string {
	const marker = comment.style === 'hash' ? '#' : ';';
	return `${marker} ${comment.value}`;
}

function wrapInstruction(
	keyword: string,
	args: string[],
	trailingComment: string | undefined,
	indent: string,
	isArithmetic: boolean,
	options: PrinterOptions,
): string {
	const joinFn = (tokens: string[]) => (isArithmetic ? tokens.join(' ') : joinWithCompactPipes(tokens));
	const joined = joinFn(args);
	const singleLine = args.length > 0 ? `${indent}${keyword} ${joined}` : `${indent}${keyword}`;
	const fullLine = trailingComment ? `${singleLine} ${trailingComment}` : singleLine;

	if (fullLine.length <= options.printWidth) {
		return fullLine;
	}

	const contIndent = indent + (options.useTabs ? '\t' : ' '.repeat(options.indentSize));
	const resultLines: string[] = [];
	let current = `${indent}${keyword}`;

	for (const arg of args) {
		const candidate = `${current} ${arg}`;
		if (candidate.length + 2 > options.printWidth && current.length > indent.length) {
			resultLines.push(`${current} \\`);
			current = `${contIndent}${arg}`;
		} else {
			current = candidate;
		}
	}

	if (trailingComment) {
		current = `${current} ${trailingComment}`;
	}
	resultLines.push(current);

	return resultLines.join(options.eol);
}

/**
 * Checks whether a node is a block-opening instruction (or a case-arm opener).
 */
function isBlockOpen(node: CSTNode): boolean {
	if (node.type !== 'instruction') return false;
	const kw = node.keyword.toLowerCase();
	return rules.open.has(kw) || rules.case.has(kw);
}

/**
 * Checks whether a node is a block-closing instruction.
 */
function isBlockClose(node: CSTNode): boolean {
	return node.type === 'instruction' && rules.close.has(node.keyword.toLowerCase());
}

/**
 * Ensures blank lines exist between block boundaries and non-block
 * statements. Inserts blanks:
 *
 * - Before a block opener if preceded by a non-block, non-comment node
 * - After a block closer if followed by any non-block node (including comments)
 *
 * Comments before a block opener are exempt — they describe the upcoming
 * block and should stay attached to it.
 */
function ensureBlankAroundBlocks(nodes: CSTNode[]): CSTNode[] {
	const result: CSTNode[] = [];
	let prevNonBlank: CSTNode | undefined;

	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i] as CSTNode;
		const lastIsBlank = result.length > 0 && (result[result.length - 1] as CSTNode).type === 'blank';

		if (prevNonBlank && !lastIsBlank && node.type !== 'blank') {
			// Before an open keyword: insert blank if prev is a regular instruction
			if (isBlockOpen(node) && !isBlockOpen(prevNonBlank) && prevNonBlank.type !== 'comment') {
				result.push({ type: 'blank' });
			}
			// Before a comment that leads into a block opener
			else if (node.type === 'comment' && !isBlockOpen(prevNonBlank) && prevNonBlank.type !== 'comment') {
				let j = i + 1;
				while (j < nodes.length && ((nodes[j] as CSTNode).type === 'blank' || (nodes[j] as CSTNode).type === 'comment'))
					j++;
				if (j < nodes.length && isBlockOpen(nodes[j] as CSTNode)) {
					result.push({ type: 'blank' });
				}
			}
			// After a close keyword: insert blank if current is not another closer or opener
			else if (isBlockClose(prevNonBlank) && !isBlockClose(node) && !isBlockOpen(node)) {
				result.push({ type: 'blank' });
			}
		}

		result.push(node);
		if (node.type !== 'blank') {
			prevNonBlank = node;
		}
	}

	return result;
}

/**
 * Strips leading/trailing blank nodes and collapses consecutive blanks
 * to at most one.
 */
function trimAndCollapseBlanks(nodes: CSTNode[]): CSTNode[] {
	let start = 0;
	while (start < nodes.length && (nodes[start] as CSTNode).type === 'blank') start++;

	let end = nodes.length - 1;
	while (end >= start && (nodes[end] as CSTNode).type === 'blank') end--;

	const result: CSTNode[] = [];
	let prevBlank = false;

	for (let i = start; i <= end; i++) {
		const node = nodes[i] as CSTNode;
		if (node.type === 'blank') {
			if (!prevBlank) {
				result.push(node);
				prevBlank = true;
			}
		} else {
			result.push(node);
			prevBlank = false;
		}
	}

	return result;
}
