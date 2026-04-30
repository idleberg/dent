# @nsis/dent-cli

> An opinionated code formatter for NSIS scripts

[![License](https://img.shields.io/github/license/idleberg/node-dent-cli?color=blue&style=for-the-badge)](https://github.com/idleberg/node-dent-cli/blob/main/LICENSE)
[![Version](https://img.shields.io/npm/v/@nsis/dent-cli?style=for-the-badge)](https://www.npmjs.org/package/@nsis/dent-cli)
[![Build](https://img.shields.io/github/actions/workflow/status/idleberg/node-dent-cli/default.yml?style=for-the-badge)](https://github.com/idleberg/node-dent-cli/actions)

## Installation

### Node.js

For single-use, use `npx` to download and run the CLI:

```sh
$ npx -y @nsis/dent-cli --help
```

Or, if you prefer to install the CLI:

```sh
$ npm install --global @nsis/dent-cli
$ npx dent --help
```

### Scoop

The CLI is available to users of the [Scoop](https://scoop.sh/) package manager.

```powershell
# Add the bucket
scoop bucket add nsis https://github.com/NSIS-Dev/scoop-nsis

# Install dent
scoop install nsis/dent
```

### Download

As a last resort, you can download [pre-compiled binaries](https://github.com/idleberg/node-dent-cli/releases/latest) for Windows.

## Usage

As an opinionated formatter, there are but a few options you can tweak. Run `dent --help` for a list of all options.

```
Usage: dent [options] <file...>

CLI tool to format NSIS scripts

Options:
  -V, --version               output the version number
  -D, --debug                 prints additional debug messages (default: false)
  -h, --help                  display help for command

Formatting Options
  -e, --eol <"crlf"|"lf">     control how line-breaks are represented (default: "lf")
  -i, --indent-size <number>  number of units per indentation level (default: 2)
  -s, --use-spaces            indent with spaces instead of tabs (default: false)
  -t, --trim                  trim empty lines (default: true)
  -w, --write                 edit files in-place (default: false)
```

## Related

- [dent](https://www.npmjs.com/package/@nsis/dent)

## License

This work is licensed under [The MIT License](LICENSE)
  
