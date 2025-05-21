import type { RuleEntry } from '@eslint/config-helpers'

export const TYPESCRIPT_RULES = {
	'@typescript-eslint/no-unused-vars': 'off',
	'@typescript-eslint/no-empty-interface': 'off',
	'@typescript-eslint/no-empty-object-type': 'off',
	'@stylistic/member-delimiter-style': [
		'error',
		{
			'multiline': {
				'delimiter': 'none',
				'requireLast': false
			},
			'singleline': {
				'delimiter': 'comma',
				'requireLast': false
			}
		}
	],
	'@stylistic/type-annotation-spacing': [
		'error',
		{
			'before': false,
			'after': true,
			'overrides': {
				'arrow': {
					'before': true,
					'after': true
				}
			}
		}
	],
	'@stylistic/type-generic-spacing': 'error',
	'@typescript-eslint/naming-convention': [
		'error',
		{
			'selector': 'interface',
			'format': ['PascalCase'],
			'custom': {
				'regex': '^I[A-Z]',
				'match': false
			}
		}
	]
} satisfies Record<string, RuleEntry>