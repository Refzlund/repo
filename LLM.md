# LLM Documentation for `@refzlund/repo`

This document is for agentic coding assistants. It explains how to use the `repo-pack` tool for packaging Svelte/SvelteKit libraries.

---

## Quick Start

### Simple Usage (No Options)

For standard Svelte/SvelteKit packages with default structure:

```bash
bunx repo-pack
```

This assumes:
- Source code is in `./src`
- Output goes to `./_package/dist`
- `package.json`, `README.md`, and `LICENSE` exist in the project root (or up to 2 parent directories)

### Programmatic Usage (With Options)

Create a custom packaging script (e.g., `scripts/pack.ts`):

```ts
import { pack } from '@refzlund/repo/pack'

await pack({
  input: './src/lib',
  outDir: '_package',
  distDir: 'dist',
  // ... additional options
})
```

Run it:
```bash
bun scripts/pack.ts
```

---

## All Available Options

### `PackOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `input` | `string` | `'./src'` | Input directory for svelte-package |
| `outDir` | `string` | `'_package'` | Output directory name |
| `distDir` | `string` | `'dist'` | Distribution directory name within outDir |
| `extraFiles` | `string[]` | `[]` | Additional files to copy to package root (searched up to 2 parent dirs) |
| `copy` | `CopyEntry[]` | `[]` | Directories/files to copy into the package (granular control) |
| `copyDir` | `CopyDirEntry[]` | `[]` | Simplified directory copying with optional remapping |
| `bundle` | `BundleConfig \| BundleConfig[]` | `undefined` | Bundle entry points (CLI, workers, etc.) |
| `cli` | `BundleConfig` | `undefined` | **Deprecated:** Use `bundle` instead |
| `hooks` | `PackHooks` | `undefined` | Lifecycle hooks |

---

### `CopyEntry`

Used in `copy` option to copy directories/files into the package.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `from` | `string` | Yes | Source path, relative to package root (can use `../`) |
| `to` | `string` | Yes | Destination path, relative to output directory |
| `exclude` | `string[]` | No | Glob patterns to exclude |

**Example:**
```ts
copy: [
  { from: './assets', to: 'assets' },
  { from: '../shared/icons', to: 'icons', exclude: ['*.test.ts'] }
]
```

---

### `CopyDirEntry`

Used in `copyDir` option for simplified directory copying with optional file remapping.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `from` | `string` | Yes | Source directory, relative to package root |
| `to` | `string` | No | Destination directory in output (defaults to basename of `from`) |
| `exclude` | `string[]` | No | Glob patterns to exclude |
| `remap` | `Record<string, string>` | No | Remap specific files/folders to different locations |

**Example:**
```ts
copyDir: [
  {
    from: '../cli',
    to: 'cli',
    exclude: ['**/__*/**', 'node_modules/**', '.svelte-kit/**'],
    remap: {
      // Remap files within the copied structure
      'cli-output/svelte.config.js': 'svelte.config.js',
      'cli-output/vite.config.ts': 'vite.config.ts'
    }
  }
]
```

This copies:
- `../cli/src/*` → `cli/src/*`
- `../cli/static/*` → `cli/static/*`
- `../cli/cli-output/svelte.config.js` → `cli/svelte.config.js` (remapped)
- `../cli/cli-output/vite.config.ts` → `cli/vite.config.ts` (remapped)

---

### `BundleConfig` (formerly `CliBundleConfig`)

Used in `bundle` option to bundle entry points (CLI tools, workers, etc.).

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `entry` | `string` | Required | Entry file path, relative to package root |
| `output` | `string` | Required | Output file path, relative to the output directory |
| `format` | `'esm' \| 'cjs'` | `'esm'` | Output format |
| `platform` | `'node' \| 'browser'` | `'node'` | Target platform |
| `external` | `string[]` | `[]` | External dependencies (supports patterns like `'node:*'`) |
| `shebang` | `boolean` | `false` | Add `#!/usr/bin/env node` shebang (also adds to package.json `bin`) |
| `transforms` | `CliTransform[]` | `[]` | Post-bundle string transforms |
| `binName` | `string` | `undefined` | Sets/overrides package.json `"bin"` mapping key |
| `minify` | `boolean` | `false` | Minify the output |

**Single Bundle Example:**
```ts
bundle: {
  entry: './src/cli/index.ts',
  output: 'bin/my-cli.js',
  shebang: true,
  external: ['node:*', 'bun'],
  binName: 'my-tool'
}
```

**Multiple Bundles Example:**
```ts
bundle: [
  {
    entry: './src/cli/main.ts',
    output: 'bin/cli.js',
    shebang: true,
    binName: 'my-package'
  },
  {
    entry: './src/worker.ts',
    output: 'worker.js',
    platform: 'browser',
    minify: true
  }
]
```

> **Note:** Only entries with `shebang: true` are added to the package.json `bin` field.

---

### `CliTransform`

Used in `bundle.transforms` for post-bundle string replacements. This is useful for fixing paths that change after bundling (e.g., `__dirname`-based paths).

| Property | Type | Description |
|----------|------|-------------|
| `find` | `string \| RegExp` | String or regex pattern to find |
| `replace` | `string` | Replacement string |

**Example:**
```ts
transforms: [
  { find: '__VERSION__', replace: '1.0.0' },
  { find: /console\.log\([^)]*\);?/g, replace: '' },
  // Fix __dirname paths after bundling changes directory depth
  { find: "resolve(__dirname, '../..')", replace: "resolve(__dirname, '..')" }
]
```

---

### `PackHooks`

Lifecycle hooks for custom commands at various stages.

| Hook | When it runs |
|------|--------------|
| `prePack` | Before anything else |
| `postSync` | After `svelte-kit sync` |
| `postPackage` | After `svelte-package` (before copying files) |
| `postCopy` | After copying directories |
| `postBundle` | After CLI bundling |
| `postPack` | After everything is complete |

Each hook accepts `string | string[]` (shell commands).

**Example:**
```ts
hooks: {
  prePack: 'bun run generate-types',
  postPackage: ['bun run lint', 'bun run test'],
  postPack: 'echo "Done!"'
}
```

---

## Full Example

```ts
import { pack } from '@refzlund/repo/pack'

await pack({
  input: './src/lib',
  outDir: '_package',
  distDir: 'dist',
  
  extraFiles: ['CHANGELOG.md', '.npmrc'],
  
  // Granular copying
  copy: [
    { from: './templates', to: 'templates' },
    { from: './bin', to: 'bin', exclude: ['*.test.ts', '*.spec.ts'] }
  ],
  
  // Simplified directory copying with remapping
  copyDir: [
    {
      from: '../cli',
      to: 'cli',
      exclude: ['node_modules/**', '.svelte-kit/**'],
      remap: {
        'cli-output/svelte.config.js': 'svelte.config.js'
      }
    }
  ],
  
  // Multiple bundle entry points
  bundle: [
    {
      entry: './src/cli/main.ts',
      output: 'bin/cli.js',
      format: 'esm',
      platform: 'node',
      external: ['node:*', 'bun'],
      shebang: true,
      binName: 'my-package',
      transforms: [
        { find: '__DEV__', replace: 'false' }
      ]
    },
    {
      entry: './src/worker.ts',
      output: 'worker.js',
      platform: 'browser',
      minify: true
    }
  ],
  
  hooks: {
    prePack: 'bun run typecheck',
    postSync: 'bun run generate',
    postPackage: 'bun run test',
    postPack: 'echo "Package ready in _package/"'
  }
})
```

---

## Type Helper

Use `definePackOptions` for type inference in config files:

```ts
import { definePackOptions } from '@refzlund/repo/pack'

export default definePackOptions({
  input: './src',
  bundle: {
    entry: './cli.ts',
    output: 'bin/cli.js',
    shebang: true
  }
})
```

---

## What `pack()` Does

1. Runs `prePack` hook
2. Cleans output directories (`_package/`, `.svelte-kit/`)
3. Runs `svelte-kit sync`
4. Runs `postSync` hook
5. Runs `svelte-package`
6. Runs `postPackage` hook
7. Runs `publint` for validation
8. Copies `package.json`, `README.md`, `LICENSE` to output
9. Copies `extraFiles` to output
10. Copies `copy` entries (granular)
11. Copies `copyDir` entries (with remapping)
12. Runs `postCopy` hook
13. Bundles entry points (if configured)
14. Runs `postBundle` hook
15. Removes `.stories.*` files from dist
16. Rewrites `package.json` exports for publishing
17. Validates `publishConfig.directory`
18. Runs `postPack` hook

---

## Output Structure

After running `pack()`:

```
_package/
├── package.json    # Rewritten with correct exports
├── README.md
├── LICENSE
└── dist/           # svelte-package output
    ├── index.js
    ├── index.d.ts
    └── ...
```

The `package.json` in `_package/` will have:
- `devDependencies` removed
- `private` field removed
- `publishConfig` removed
- `scripts` removed
- `exports` rewritten to point to `./dist/*`
- `bin` updated if any bundle has `shebang: true`
- `files` array generated (without duplicates)

---

## Publishing Setup

### Prerequisites

1. **Remove `private: true`** from your `package.json` (or set it to `false`)

2. **Add `publishConfig`** to your `package.json`:

```json
{
  "name": "my-package",
  "version": "1.0.0",
  "publishConfig": {
    "directory": "_package"
  }
}
```

The `publishConfig.directory` tells npm to publish from the `_package/` output directory instead of the project root.

---

### Publishing to npm with GitHub Actions (OIDC)

For automated publishing to npmjs, use [OpenID Connect (OIDC)](https://gh.io/npm-docs-trusted-publishers) for secure, token-free authentication.

#### Setup npm Trusted Publishers

1. Go to your npm package settings
2. Configure "Trusted Publishers" to allow your GitHub repository

#### GitHub Workflow (with `@changesets/cli`)

Create `.github/workflows/publish.yml`:

```yaml
name: Publish

on:
  push:
    branches:
      - main  # Change to your base branch

permissions:
  id-token: write
  contents: write
  pull-requests: write

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repo
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Setup Node.js (for npm publish with OIDC)
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - name: Update npm for OIDC support
        run: npm install -g npm@latest  # MUST use npm install, not bun

      - name: Install Dependencies
        run: bun install

      # https://github.com/changesets/action#with-publishing
      - name: Create Release Pull Request or Publish
        id: changesets
        uses: changesets/action@v1
        with:
          publish: bun run publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### Package.json Scripts

Add the publish script to your `package.json`:

```json
{
  "scripts": {
    "publish": "bun run pack && npm publish ./_package --provenance --access public"
  }
}
```

> **Note:** The `--provenance` flag enables npm provenance attestation (requires OIDC). Use `--access public` for scoped packages that should be public.

---

### Manual Publishing

For manual publishing:

```bash
# 1. Package the library
bun run pack
# or
bunx repo-pack

# 2. Publish from output directory
cd _package
npm publish --access public
```

---

### Changesets Integration

If using `@changesets/cli` for versioning:

```bash
# Initialize changesets
bunx changeset init

# Create a changeset
bunx changeset

# Version packages (updates package.json and CHANGELOG)
bunx changeset version

# Publish (run pack + npm publish)
bun run publish
```
