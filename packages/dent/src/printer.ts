import type { Comment, CommentNode, CSTNode, InstructionNode, LabelNode } from '@nsis/parser';
import { ensureBlankAroundBlocks, trimAndCollapseBlanks } from './blank-lines.ts';
import { canonicalCasing } from './canonical-casing.ts';
import { canonicalIncludes } from './canonical-includes.ts';
import { isArithmeticKeyword, joinInstructionArgs, normalizeInstructionArgs } from './normalize.ts';
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

function printInstruction(node: InstructionNode, level: number, options: PrinterOptions): string {
	const kwLower = node.keyword.toLowerCase();
	const keyword = canonicalCasing.get(kwLower) ?? canonicalIncludes.get(kwLower) ?? node.keyword;
	const isArithmetic = isArithmeticKeyword(kwLower);
	const args = normalizeInstructionArgs(node.args, node.keyword, options.singleQuote);
	const indent = indentStr(level, options);

	if (options.printWidth > 0 && args.length > 0) {
		const trailing = node.comment ? printTrailingComment(node.comment) : undefined;
		return wrapInstruction(keyword, args, trailing, indent, isArithmetic, options);
	}

	const joined = joinInstructionArgs(args, node.keyword);
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
	const joinFn = (tokens: string[]) => (isArithmetic ? tokens.join(' ') : joinInstructionArgs(tokens, keyword));
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
