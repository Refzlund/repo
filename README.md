# @refzlund/repo

Bun-engine driven tools used for development, build, package release and more.

<br>

### ESLint

`eslint.config.ts`
```ts
import eslint from 'github:refzlund/repo/eslint'

const config = eslint(import.meta.url)

export default config
```

<br>
<br>

### TypeScript

`tsconfig.json`
```jsonc
{
	"extends": "github:refzlund/repo/tsconfig.base.json"
}
```

<br>
<br>

### CLI colors and spinners

```ts
import 'github:refzlund/repo/cli-colors' // via `colors`
console.log('text'.green)
```

```ts
import spin 'github:refzlund/repo/cli-spinner' // via `ora`
const spinner = spin('Loading...')
spinner.succeed('Successful!')
```


<br>
<br>

### Packaging for publish

Via `bunx repo-package`

> ⠴ Packaging my-package v2.0.3  
> ✔ Finished packaging my-package v2.0.3 -> _package

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