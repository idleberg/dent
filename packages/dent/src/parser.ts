import { parse as peggyParse } from './grammar.js';

export type Comment = {
	style: 'hash' | 'semicolon';
	value: string;
};

export type BlankNode = {
	type: 'blank';
};

export type CommentNode = {
	type: 'comment';
	style: 'hash' | 'semicolon' | 'block';
	value: string;
};

export type InstructionNode = {
	type: 'instruction';
	keyword: string;
	args: string[];
	comment?: Comment;
};

export type LabelNode = {
	type: 'label';
	name: string;
	comment?: Comment;
};

export type CSTNode = BlankNode | CommentNode | InstructionNode | LabelNode;

/**
 * Parses NSIS source text into a flat list of CST nodes.
 *
 * @param input - The NSIS source code to parse.
 * @returns An array of CST nodes, one per logical line.
 * @throws {SyntaxError} If the input cannot be parsed.
 */
export function parse(input: string): CSTNode[] {
	// Strip BOM and handle line continuations before parsing
	const preprocessed = input.replace(/^\uFEFF/, '').replace(/\\[ \t]*\r?\n[ \t]*/g, ' ');
	return peggyParse(preprocessed) as CSTNode[];
}
