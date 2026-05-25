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

The CLI exposes two sub-commands:

- `dent format` — formats NSIS scripts
- `dent check` — checks if a script needs formatting

```
Usage: dent [options] [command]

CLI tool to format NSIS scripts

Options:
  -V, --version               output the version number
  -D, --debug                 prints additional debug messages (default: false)
  -h, --help                  display help for command

Commands:
  format [options] [file...]  format NSIS scripts
  check [options] [file...]   check whether NSIS scripts are formatted (exits non-zero on drift)
```

Run `dent --help` to list sub-commands, or `dent <command> --help` for command-specific options.

## Related

- [dent](https://www.npmjs.com/package/@nsis/dent)

## License

This work is licensed under [The MIT License](LICENSE)
