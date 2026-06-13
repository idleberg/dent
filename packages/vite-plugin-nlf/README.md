# @nsis/vite-plugin-nlf

> A Vite plugin to load NSIS language files

[![License](https://img.shields.io/github/license/idleberg/vite-plugin-nlf?color=blue&style=for-the-badge)](https://github.com/idleberg/vite-plugin-nlf/blob/main/LICENSE)
[![Version](https://img.shields.io/npm/v/@nsis/vite-plugin-nlf?style=for-the-badge)](https://www.npmjs.org/package/@nsis/vite-plugin-nlf)
[![Build](https://img.shields.io/github/actions/workflow/status/idleberg/vite-plugin-nlf/tests.yml?style=for-the-badge)](https://github.com/idleberg/vite-plugin-nlf/actions)

## Installation

`npm install -D @nsis/vite-plugin-nlf`

## Usage

```js
// vite.config.js
import { defineConfig } from 'vite';
import nlf from '@nsis/vite-plugin-nlf';

export default defineConfig({
    plugins: [
        nlf()
    ]
});
```

```js
// example.js
import English from './Contrib/Language files/English.nlf';

console.log(`The ID for English is ${English.id}`);
```

## License

This work is licensed under [The MIT License](LICENSE).
