# Typescript Library Template (Boilerplate)

## Key configurations

tsconfig.json:

- Compiler option `"declaration": true` generates corresponding definition files (`*.d.ts`) to output directory. 

webpack.config.js:

- Output: `libraryTarget: 'umd'` - This exposes your library under all the module definitions, allowing it to work with CommonJS, AMD and as global variable, (library name must be specified). See [Authoring a Library](https://webpack.js.org/guides/author-libraries/).

## Build library

    npm i
    npm run build

## Consume library

From local folder:

    npm i -S <path>

Then in code: `import { Api } from 'api/dist'`