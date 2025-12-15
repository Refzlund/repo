# @refzlund/repo

Bun-engine driven tools used for development, build, package release and more.

#### Usage

Install from the GitHub repository directly

`bun add -D refzlund/repo`

<br>

### ESLint

Create a script that fixes issues, and also removes unused imports:
```jsonc
"scripts": {
    "format": "bun --bun eslint --config ./eslint.config.ts --rule 'unused-imports/no-unused-imports: [warn]' --fix . ",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json"
},
```

If using Svelte/SvelteKit, including `svelte-check` will do additional type-checking for the files.

`eslint.config.ts`
```ts
import eslint from '@refzlund/repo/eslint'

const config = eslint(import.meta.url)

export default config
```

<br>
<br>

### TypeScript

`tsconfig.json`
```jsonc
{
    "extends": "@refzlund/repo/tsconfig.base.json"
}
```

or for SvelteKit apps

```jsonc
{
   "extends": [
        "@refzlund/repo/tsconfig.base.json",
        "./.svelte-kit/tsconfig.json"
    ]
}
```

<br>
<br>

### CLI colors and spinners

```ts
import '@refzlund/repo/cli-colors' // via `colors`
console.log('text'.green)
```

```ts
import spin '@refzlund/repo/cli-spinner' // via `ora`
const spinner = spin('Loading...')
spinner.succeed('Successful!')
```


<br>
<br>

### Packaging for publish — `bunx repo-pack`

> ⠴ Packaging my-package v2.0.3  
> ✔ Finished packaging my-package v2.0.3 -> _package

<br>

#### Recommended: call `pack()` from your own script

`repo-pack` is now implemented as a function export, so each package can have its own small `pack.ts` script (no config-file loading).

Create `pack.ts` in the package root:

```ts
import { pack, definePackOptions } from '@refzlund/repo/pack'

await pack(definePackOptions({
    // defaults:
    // input: './src'
    // outDir: '_package'
    // distDir: 'dist'

    // Copies are in addition to the nearest README.md + LICENSE
    extraFiles: ['LLM.md'],

    copy: [
        {
            from: './emails',
            to: './emails',
            exclude: ['**/*.stories.*', '**/*.test.*']
        }
    ],

    cli: {
        entry: './bin/cli.ts',
        output: './bin/my-cli.js',
        shebang: true,
        binName: 'my-cli'
    },

    hooks: {
        postPackage: 'bun scripts/fix-esm-imports.ts'
    }
}))
```

Run it from that package folder:

`bun ./pack.ts`

You can still run the zero-config wrapper:

`bunx repo-pack`

<br>

#### LICENSE, README.md

Will pick the nearest `LICENSE` and `README.md` file (from `./`, `../` or `../../` for monorepo support). 

<br>

#### package.json publishConfig

Provide the `publishConfig` directory to assign what code is packed and published.

```jsonc
"publishConfig": {
    "directory": "_package"
}
```

If you set `outDir` to something else, keep `publishConfig.directory` in sync.

<br/>

#### package.json Exports

For `package.json` `exports` should follow this format:

```jsonc
"exports": {
    ".": "./src/index.ts",
    "./module": "./src/module/index.ts",
}
```

When built, these become

```jsonc
"exports": {
    ".": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js",
        "svelte": "./dist/index.js" // <- Recognizes Svelte projects automatically (example)
    },
    "./module": {
        "types": "./dist/module/index.d.ts",
        "default": "./dist/module/index.js" // <- Not a svelte project (example)
    }
}
```

<br>

#### package.json Files

`"files": [...]` is optional.
<br/>
`"dist"`, `"LICENSE"`, `"README.md"` are added by default.




<br>
<br>

### Version Control — `bunx repo-changelog`





<br>
<br>

### Formatting & linting — `bunx repo-format`

Alternatively, lint yourself; `bun --bun eslint --config ./eslint.config.ts --rule 'unused-imports/no-unused-imports: [warn]' --fix .`