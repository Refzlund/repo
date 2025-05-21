import { globalIgnores } from 'eslint/config'

/**
### Default ignores

'\*\*\/.svelte-kit/*'  
'\*\*\/node_modules/**'  
'\*\*\/node_modules/zod/**'  
'\*\*\/node_modules/zod/lib/**'  
'\*\*\/node_modules/zod/lib/index.mjs'  
'\*\*\/.wrangler/*'  
'\*\*\/.git/*'  
'\*\*\/.mongodb/*'  
'\*\*\/.cloudflare/*'  
'\*\*\/lang/src/paraglide/*'  
'\*\*\/src-tauri/target/*'  
'\*\*\/_package/*'  
'\*\*\/.turbo/**'  
*/
export function ignorePatterns(...patterns: string[]) {
	return globalIgnores([
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
		'**/_package/*',
		'**/.turbo/**',
		...patterns
	])
}