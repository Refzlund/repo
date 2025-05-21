/*
	bun add -D @eslint/compat @eslint/js eslint-plugin-svelte eslint globals typescript-eslint @stylistic/eslint-plugin eslint-plugin-unused-imports eslint-plugin-import-no-duplicates-prefix-resolved-path eslint-plugin-import-x eslint-import-resolver-typescript @sveltejs/vite-plugin-svelte eslint-module-utils jiti
*/

import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import { fileURLToPath } from 'node:url'
import ts from 'typescript-eslint'
import svelteConfig from '../svelte/svelte.config.js'
import stylistic from '@stylistic/eslint-plugin'
import unusedImports from 'eslint-plugin-unused-imports'
import importPrefix from 'eslint-plugin-import-no-duplicates-prefix-resolved-path'
import importX from 'eslint-plugin-import-x'
import 'eslint-import-resolver-typescript' // required for eslint-plugin-import-x
import tailwind from 'eslint-plugin-tailwindcss'

// Config
import { IGNORE_PATTERNS } from './ignore-patterns'
import { SLOW_RULES } from './slow-rules'
import { IMPORTING_RULES } from './importing-rules'
import { TYPESCRIPT_RULES } from './typescript-rules'
import { STYLISTIC_RULES } from './stylistic-rules'
import { SVELTE_RULES } from './svelte-rules'

export function eslint(metaURL: string) {
	const gitignorePath = fileURLToPath(new URL('./.gitignore', metaURL))
	const tsconfigPath = fileURLToPath(new URL('./tsconfig.json', metaURL))
	const tsconfigPaths = fileURLToPath(new URL('./*/tsconfig.json', metaURL))
	
	return ts.config(
		includeIgnoreFile(gitignorePath),
		IGNORE_PATTERNS,
		js.configs.recommended,
		ts.configs.recommended,
		svelte.configs.recommended,
		tailwind.configs['flat/recommended'],
		{
			files: ['**/*.{js,mjs,cjs,ts,svelte}'],
			extends: [importX.flatConfigs.recommended, importX.flatConfigs.typescript],
			ignores: ['./**/node_modules/**'],
			languageOptions: {
				globals: {
					...globals.browser,
					...globals.node 
				},
				parserOptions: {
					projectService: { defaultProject: tsconfigPath },
					extraFileExtensions: ['.svelte'],
					parser: ts.parser,
					svelteConfig,
					// Optimizing for performance
					tsconfigRootDir: metaURL,
					project: [
						tsconfigPath,
						tsconfigPaths
					],
					cacheLifetime: { glob: 'Infinity' },
					// Add cache strategy for better performance
					cache: true
				}
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
				...STYLISTIC_RULES,
				...SVELTE_RULES
			}
		}
		
	)
}