import type { ConfigWithExtends } from 'typescript-eslint'
import type { ParserOptions } from './eslint-types'

export function svelteESLint(
	svelteConfig: unknown,
	parserOptions: ParserOptions
) {
	return {
		files: ['**/*.{js,mjs,cjs,ts,svelte}'],
		ignores: ['./**/node_modules/**'],
		languageOptions: {
			parserOptions: {
				...parserOptions,
				extraFileExtensions: ['.svelte'],
				svelteConfig
			}
		},
		rules: {
			// used in $effects to trigger them
			'@typescript-eslint/no-unused-expressions': 'off',

			'svelte/html-quotes': ['error', { 'prefer': 'single' }],
			'svelte/max-attributes-per-line': [
				'error',
				{
					'multiline': 1,
					'singleline': 2
				}
			],
			'svelte/indent': [
				'error',
				{
					'indent': 'tab'
				}
			],
			'svelte/no-useless-mustaches': 'off',
			'svelte/shorthand-attribute': 'error',
			'svelte/shorthand-directive': 'error',
			'svelte/sort-attributes': 'error',
			'svelte/spaced-html-comment': 'error',
			'svelte/no-spaces-around-equal-signs-in-attribute': 'error',
			'svelte/first-attribute-linebreak': [
				'error',
				{
					'multiline': 'below',
					'singleline': 'beside'
				}
			],
			'svelte/html-closing-bracket-new-line': [
				'error',
				{
					'singleline': 'never',
					'multiline': 'always',
					'selfClosingTag': {
						'singleline': 'never',
						'multiline': 'always'
					}
				}
			],
			'svelte/html-closing-bracket-spacing': [
				'error',
				{
					'startTag': 'never',
					'endTag': 'never',
					'selfClosingTag': 'always'
				}
			]
		}
	} satisfies ConfigWithExtends
}