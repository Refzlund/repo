/*
	bun add -D @eslint/compat @eslint/js eslint-plugin-svelte eslint globals typescript-eslint @stylistic/eslint-plugin eslint-plugin-unused-imports eslint-plugin-import-no-duplicates-prefix-resolved-path eslint-plugin-import-x eslint-import-resolver-typescript @sveltejs/vite-plugin-svelte eslint-module-utils jiti
*/

import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import { fileURLToPath } from 'node:url'
import ts, { type InfiniteDepthConfigWithExtends } from 'typescript-eslint'
import svelteConfig from '../svelte/svelte.config.js'
import stylistic from '@stylistic/eslint-plugin'
import unusedImports from 'eslint-plugin-unused-imports'
import importPrefix from 'eslint-plugin-import-no-duplicates-prefix-resolved-path'
import importX from 'eslint-plugin-import-x'
import 'eslint-import-resolver-typescript' // required for eslint-plugin-import-x
import tailwind from 'eslint-plugin-tailwindcss'

// Config
import { ignorePatterns } from './ignore-patterns'
import { SLOW_RULES } from './slow-rules'
import { IMPORTING_RULES } from './importing-rules'
import { TYPESCRIPT_RULES } from './typescript-rules'
import { STYLISTIC_RULES } from './stylistic-rules'
import { svelteESLint } from './svelte-rules'
import type { ParserOptions } from './eslint-types.js'

interface ESLintOptions {
	/**
	### Default ignores

	`**\.svelte-kit\*`  
	`**\node_modules\**`  
	`**\node_modules\zod\**`  
	`**\node_modules\zod\lib\**`  
	`**\node_modules\zod\lib\index.mjs`  
	`**\.wrangler\*`  
	`**\.git\*`  
	`**\.mongodb\*`  
	`**\.cloudflare\*`  
	`**\lang\src\paraglide\*`  
	`**\src-tauri\target\*`  
	`**\_package\*`  
	`**\.turbo\**`  
	*/
	ignores?: string[]
}

export default function eslint(metaURL: string, ...configs: InfiniteDepthConfigWithExtends[]) {
	const gitignorePath = fileURLToPath(new URL('./.gitignore', metaURL))
	const tsconfigPath = fileURLToPath(new URL('./tsconfig.json', metaURL))
	const tsconfigPaths = fileURLToPath(new URL('./*/tsconfig.json', metaURL))
	
	const parserOptions = {
		projectService: { defaultProject: tsconfigPath },
		parser: ts.parser,
		// Optimizing for performance
		tsconfigRootDir: metaURL,
		project: [
			tsconfigPath,
			tsconfigPaths
		],
		extraFileExtensions: ['.svelte'],
		svelteConfig,
		cacheLifetime: { glob: 'Infinity' },
		// Add cache strategy for better performance
		cache: true
	} satisfies ParserOptions

	return ts.config(
		includeIgnoreFile(gitignorePath),
		js.configs.recommended,
		ts.configs.recommended,
		svelte.configs.recommended,
		tailwind.configs['flat/recommended'],
		{
			files: ['**/*.{js,mjs,cjs,ts,svelte,tsx,jsx}', '.storybook/*.ts'],
			extends: [importX.flatConfigs.recommended, importX.flatConfigs.typescript],
			ignores: ['./**/node_modules/**'],
			languageOptions: {
				globals: {
					...globals.browser,
					...globals.node 
				},
				parserOptions
			},
			plugins: {
				'@stylistic': stylistic,
				'unused-imports': unusedImports,
				'import-no-duplicates-prefix-resolved-path': importPrefix
			},
			rules: {
				...SLOW_RULES,
				...IMPORTING_RULES,
				...TYPESCRIPT_RULES,
				...STYLISTIC_RULES
			}
		},
		svelteESLint(svelteConfig, parserOptions),
		...configs
	)
}