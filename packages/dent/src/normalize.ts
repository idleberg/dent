import { globalParameterPrefixes, globalParameters, instructionParameters } from './canonical-parameters.ts';

const arithmeticInstructions = new Set(['intop', 'intptrop']);

export function normalizeInstructionArgs(args: string[], keyword: string, singleQuote: boolean): string[] {
	const kwLower = keyword.toLowerCase();
	const instrParams = instructionParameters.get(kwLower);
	const isArithmetic = arithmeticInstructions.has(kwLower);
	const split = isArithmetic ? splitArithmeticTokens(args) : splitPipeTokens(args);
	return split.map((arg) => normalizeArg(arg, instrParams, singleQuote));
}

export function isArithmeticKeyword(keyword: string): boolean {
	return arithmeticInstructions.has(keyword.toLowerCase());
}

export function joinInstructionArgs(args: string[], keyword: string): string {
	return isArithmeticKeyword(keyword) ? args.join(' ') : joinWithCompactPipes(args);
}

export function normalizeQuotes(arg: string, singleQuote: boolean): string {
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

export function normalizeArg(
	arg: string,
	instrParams: ReadonlyMap<string, string> | undefined,
	singleQuote: boolean,
): string {
	if (arg.startsWith('$')) {
		return arg;
	}
	if (arg.startsWith('"') || arg.startsWith("'") || arg.startsWith('`')) {
		return normalizeQuotes(arg, singleQuote);
	}

	const lower = arg.toLowerCase();

	const exact = instrParams?.get(lower) ?? globalParameters.get(lower);
	if (exact !== undefined) return exact;

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

export function splitPipeTokens(args: string[]): string[] {
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

export function splitArithmeticTokens(args: string[]): string[] {
	return args.flatMap((arg) => {
		if (arg.startsWith('"') || arg.startsWith("'") || arg.startsWith('`')) {
			return [arg];
		}
		if (ARITHMETIC_OPS.has(arg)) {
			return [arg];
		}
		return tokenizeArithmetic(arg);
	});
}

export function joinWithCompactPipes(args: string[]): string {
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

function splitPreservingGroups(arg: string, sep: string): string[] {
	const result: string[] = [];
	let current = '';
	let i = 0;

	while (i < arg.length) {
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

const ARITHMETIC_OPS = new Set(['>>>', '||', '&&', '<<', '>>', '+', '-', '*', '/', '%', '|', '&', '^', '~', '!']);
const SINGLE_CHAR_OPS = new Set(['+', '-', '*', '/', '%', '|', '&', '^', '~', '!']);

function tokenizeArithmetic(arg: string): string[] {
	const result: string[] = [];
	let current = '';
	let lastWasOp = true;
	let i = 0;

	while (i < arg.length) {
		if (arg[i] === '$' && arg[i + 1] === '{') {
			const end = arg.indexOf('}', i + 2);
			if (end !== -1) {
				current += arg.slice(i, end + 1);
				i = end + 1;
				lastWasOp = false;
				continue;
			}
		}

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

		const ch = arg[i] as string;
		if (SINGLE_CHAR_OPS.has(ch)) {
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
