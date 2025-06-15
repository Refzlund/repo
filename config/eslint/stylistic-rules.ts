import type { RuleEntry } from '@eslint/config-helpers'

/** https://eslint.style/packages/default */
export const STYLISTIC_RULES = {
	'@stylistic/quotes': [
		'error',
		'single',
		{ 'allowTemplateLiterals': 'always' }
	],
	'@stylistic/semi': ['error', 'never'],
	'@stylistic/comma-dangle': ['error', 'never'],
	'@stylistic/object-curly-spacing': ['error', 'always'],
	'@stylistic/space-before-function-paren': [
		'error',
		{
			'anonymous': 'never',
			'named': 'never',
			'asyncArrow': 'always'
		}
	],
	'@stylistic/space-before-blocks': ['error', 'always'],
	'@stylistic/indent': [
		'error',
		'tab',
		{
			'ignoredNodes': ['ConditionalExpression'],
			'ignoreComments': true,
			'offsetTernaryExpressions': false
		}
	],
	'@stylistic/indent-binary-ops': ['error', 'tab'],
	'@stylistic/array-bracket-newline': ['error', { 'multiline': true }],
	'@stylistic/array-element-newline': [
		'error',
		{
			'multiline': true,
			'consistent': true
		}
	],
	'@stylistic/space-infix-ops': ['error'],
	'@stylistic/comma-spacing': [
		'error',
		{
			'before': false,
			'after': true 
		}
	],
	'@stylistic/function-call-argument-newline': ['error', 'consistent'],
	'@stylistic/function-paren-newline': ['error', 'multiline'],
	'@stylistic/key-spacing': [
		'error',
		{
			'beforeColon': false,
			'afterColon': true,
			'mode': 'strict'
		}
	],
	'@stylistic/block-spacing': ['error', 'always'],
	'@stylistic/no-multi-spaces': ['error', { 'ignoreEOLComments': true }],
	'@stylistic/object-curly-newline': [
		'error',
		{
			'multiline': true,
			'consistent': true 
		}
	],
	'@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: false }]
} satisfies Record<string, RuleEntry>