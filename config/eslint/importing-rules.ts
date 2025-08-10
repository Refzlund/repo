import type { RuleEntry } from '@eslint/config-helpers'

export const IMPORTING_RULES = {
	'import-x/no-duplicates': 'off', // doesn't work with module declarations
	'import-no-duplicates-prefix-resolved-path/no-duplicates': [
		'warn',
		{
			'prefixResolvedPathWithImportName': true,
			'prefer-inline': true
		}
	],
	'import-x/no-named-as-default-member': 'off',
	'import-x/no-named-as-default': 'off',

	'unused-imports/no-unused-imports': 'off',
	'unused-imports/no-unused-vars': [
		'warn',
		{
			'vars': 'all',
			'varsIgnorePattern': '^_',
			'args': 'after-used',
			'argsIgnorePattern': '^_'
		}
	]
} satisfies Record<string, RuleEntry>