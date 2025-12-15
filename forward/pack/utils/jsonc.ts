/**
 * Parse JSON with comments (JSONC).
 * Strips block comments, line comments, and trailing commas.
 */
export function parseJSONWithComments(content: string): Record<string, unknown> {
	try {
		// Remove block comments
		let cleaned = content.replace(/\/\*[\s\S]*?\*\//g, '')
		// Remove line comments (but not from within strings - simplified approach)
		cleaned = cleaned.replace(/^(\s*)(\/\/.*)$/gm, '$1')
		// Remove trailing commas
		cleaned = cleaned.replace(/,\s*([}\]])/g, '$1')
		return JSON.parse(cleaned) as Record<string, unknown>
	} catch {
		return {}
	}
}
