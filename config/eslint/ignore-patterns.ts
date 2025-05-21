import { globalIgnores } from 'eslint/config'

export const IGNORE_PATTERNS = globalIgnores([
	'**/.svelte-kit/*',
	'**/node_modules/**',
	'**/node_modules/zod/**',
	'**/node_modules/zod/lib/**',
	'**/node_modules/zod/lib/index.mjs',
	'**/.wrangler/*',
	'**/.git/*',
	'**/.mongodb/*',
	'**/.cloudflare/*',
	'**/lang/src/paraglide/*',
	'**/src-tauri/target/*',
	'**/.turbo/**'
])