import type { ConfigWithExtends } from 'typescript-eslint'

export type ParserOptions = NonNullable<NonNullable<ConfigWithExtends['languageOptions']>['parserOptions']>