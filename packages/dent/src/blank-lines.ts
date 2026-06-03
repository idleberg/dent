import type { CSTNode } from './parser.ts';
import { rules } from './rules.ts';

function isBlockOpen(node: CSTNode): boolean {
	if (node.type !== 'instruction') return false;
	const kw = node.keyword.toLowerCase();
	return rules.open.has(kw) || rules.case.has(kw);
}

function isBlockClose(node: CSTNode): boolean {
	return node.type === 'instruction' && rules.close.has(node.keyword.toLowerCase());
}

export function ensureBlankAroundBlocks(nodes: CSTNode[]): CSTNode[] {
	const result: CSTNode[] = [];
	let prevNonBlank: CSTNode | undefined;

	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i] as CSTNode;
		const lastIsBlank = result.length > 0 && (result[result.length - 1] as CSTNode).type === 'blank';

		if (prevNonBlank && !lastIsBlank && node.type !== 'blank') {
			if (isBlockOpen(node) && !isBlockOpen(prevNonBlank) && prevNonBlank.type !== 'comment') {
				result.push({ type: 'blank' });
			} else if (node.type === 'comment' && !isBlockOpen(prevNonBlank) && prevNonBlank.type !== 'comment') {
				let j = i + 1;
				while (j < nodes.length && ((nodes[j] as CSTNode).type === 'blank' || (nodes[j] as CSTNode).type === 'comment'))
					j++;
				if (j < nodes.length && isBlockOpen(nodes[j] as CSTNode)) {
					result.push({ type: 'blank' });
				}
			} else if (isBlockClose(prevNonBlank) && !isBlockClose(node) && !isBlockOpen(node)) {
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

export function trimAndCollapseBlanks(nodes: CSTNode[]): CSTNode[] {
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
