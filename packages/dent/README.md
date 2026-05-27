# @nsis/dent

> An opinionated code formatter for NSIS scripts

![License](https://img.shields.io/npm/l/%40nsis%2Fdent?style=for-the-badge)
[![Version](https://img.shields.io/npm/v/@nsis/dent?style=for-the-badge)](https://www.npmjs.org/package/@nsis/dent)
[![Build](https://img.shields.io/github/actions/workflow/status/idleberg/dent/default.yml?style=for-the-badge)](https://github.com/idleberg/dent/actions)

> [!NOTE]  
> This is the repository for the formatting library. Chances are you are looking for the [CLI tool](https://github.com/idleberg/dent/tree/main/packages/dent-cli) instead.

## Installation

`npm install @nsis/dent`

## Usage

```ts
import { createFormatter } from "@nsis/dent";

const { format } = createFormatter(/* user options */);

format(`
	# Look ma, no indentation
	Name "Demo"
	Section
	Nop
	SectionEnd
`);
```

Output of the script above:

```nsis
# Look ma, no indentation
Name "Demo"

Section
	Nop
SectionEnd
```

### API

#### `format(fileContents)`

Formats the given NSIS code and returns the result as a string.

#### `check(fileContents)`

Returns `null` if the file is already formatted, otherwise the formatted string.

### Options

#### `options.endOfLine`

Type: `"crlf" | "lf"`  
Default: `"crlf"` (Windows), `"lf"` (Linux, macOS)

#### `options.indentSize`

Type: `number`  
Default: `2`

#### `options.trimEmptyLines`

Type: `boolean`  
Default: `true`

#### `options.printWidth`

Type: `numbers`  
Default: `0`

#### `options.useTabs`

Type: `boolean`  
Default: `true`

:white_check_mark: [Why defaulting to tabs is good for accessibility](https://github.com/prettier/prettier/issues/7475#issuecomment-668544890)

## Related

- [dent-cli](https://www.npmjs.com/package/@nsis/dent-cli)

## License

This work is licensed under [The MIT License](LICENSE)
