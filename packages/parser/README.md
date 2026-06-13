# @nsis/parser

> Parser for NSIS scripts

![License](https://img.shields.io/npm/l/%40nsis%2Fparser?style=for-the-badge)
[![Version](https://img.shields.io/npm/v/@nsis/parser?style=for-the-badge)](https://www.npmjs.org/package/@nsis/parser)
[![Build](https://img.shields.io/github/actions/workflow/status/idleberg/nsis-javascript-tools/default.yml?style=for-the-badge)](https://github.com/idleberg/nsis-javascript-tools/actions)

## Installation

`npm install @nsis/parser`

## Usage

```ts
import { parse } from "@nsis/parser";

const nodes = parse(`
  Name "Demo"
  Section
    Nop
  SectionEnd
`);
```

Returns a flat array of CST nodes, one per logical line:

```ts
[
	{ type: "blank" },
	{ type: "instruction", keyword: "Name", args: ['"Demo"'] },
	{ type: "instruction", keyword: "Section", args: [] },
	{ type: "instruction", keyword: "Nop", args: [] },
	{ type: "instruction", keyword: "SectionEnd", args: [] },
	{ type: "blank" },
];
```

### API

#### `parse(input)`

Parses NSIS source text into a flat list of CST nodes. Handles BOM stripping and line continuations automatically.

Throws `SyntaxError` if the input cannot be parsed.

### Node Types

#### `BlankNode`

```ts
{
	type: "blank";
}
```

#### `CommentNode`

```ts
{ type: "comment", style: "hash" | "semicolon" | "block", value: string }
```

#### `InstructionNode`

```ts
{ type: "instruction", keyword: string, args: string[], comment?: Comment }
```

#### `LabelNode`

```ts
{ type: "label", name: string, comment?: Comment }
```

## Related

- [dent](https://www.npmjs.com/package/@nsis/dent)
- [dent-cli](https://www.npmjs.com/package/@nsis/dent-cli)

## License

This work is licensed under [The MIT License](LICENSE).
