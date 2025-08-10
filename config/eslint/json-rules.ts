import type { InfiniteDepthConfigWithExtends } from 'typescript-eslint'
import json from '@eslint/json'

export const JSON_RULES = {
	files: ['**/*.{json,jsonc,json5}'],
	ignores: ['package-lock.json', '**/node_modules/**'],
	plugins: { json },
	language: 'json/json',
	extends: [json.configs.recommended]
} satisfies InfiniteDepthConfigWithExtends