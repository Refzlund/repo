import type { RuleEntry } from '@eslint/config-helpers'

export const SLOW_RULES = {
	'no-undef': 'off',
	'no-empty-pattern': 'off',
	'@typescript-eslint/no-unsafe-assignment': 'off',
	'@typescript-eslint/no-unsafe-member-access': 'off',
	'@typescript-eslint/no-unsafe-call': 'off',
	'@typescript-eslint/no-unsafe-return': 'off',
	'no-inner-declarations': 'off', // 700 ms
	'svelte/require-store-reactive-access': 'off', // 1000 ms
	'import-x/namespace': 'off', // 2000 ms
	'import-x/no-unresolved': 'off' // 80 ms
} satisfies Record<string, RuleEntry>