# nlf-cli

[![License](https://img.shields.io/github/license/idleberg/node-nlf-cli?color=blue&style=for-the-badge)](https://github.com/idleberg/node-nlf-cli/blob/main/LICENSE)
[![Version](https://img.shields.io/npm/v/@nsis/nlf-cli?style=for-the-badge)](https://www.npmjs.org/package/@nsis/nlf-cli)
![GitHub branch check runs](https://img.shields.io/github/check-runs/idleberg/node-nlf-cli/main?style=for-the-badge)

CLI tool to convert NSIS Language Files to JSON and vice versa

## Installation

```sh
npm install --global @nsis/nlf-cli
```

Alternatively, you can use it without installation

```sh
npx @nsis/nlf-cli <parameters>
```

## Usage

You can now use the `nlf` command to convert language files:

```sh
# Standard usage
nlf "Contrib/Language files/English.nlf"

# Alternatively, use stdin
cat "Contrib/Language files/English.nlf" | nlf
```

### Options

Running `nlf --help` list available flags

```
--version    output the version number
--eol        select end of line sequence
--minify     minify output JSON
--output     set the output directory
--stdout     print result to stdout
--help       output usage information
```

## Related

- [nlf](https://www.npmjs.org/package/@nsis/nlf) - library to convert NLF files
- [vite-plugin-nlf](https://www.npmjs.org/package/@nsis/vite-plugin-nlf) - Vite plugin to load NSIS language files

## License

This work is licensed under [The MIT License](https://opensource.org/licenses/MIT)
