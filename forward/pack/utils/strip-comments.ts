/**
 * Strip comments from code while preserving strings (including template literals).
 * Used for parsing imports without being confused by commented-out code.
 */
export function stripComments(code: string): string {
	let result = ''
	let i = 0
	while (i < code.length) {
		// Template literal
		if (code[i] === '`') {
			result += code[i++]
			while (i < code.length && code[i] !== '`') {
				if (code[i] === '\\') {
					result += code[i++]
				}
				if (i < code.length) {
					result += code[i++]
				}
			}
			if (i < code.length) {
				result += code[i++]
			}
		}
		// Double-quoted string
		else if (code[i] === '"') {
			result += code[i++]
			while (i < code.length && code[i] !== '"') {
				if (code[i] === '\\') {
					result += code[i++]
				}
				if (i < code.length) {
					result += code[i++]
				}
			}
			if (i < code.length) {
				result += code[i++]
			}
		}
		// Single-quoted string
		else if (code[i] === '\'') {
			result += code[i++]
			while (i < code.length && code[i] !== '\'') {
				if (code[i] === '\\') {
					result += code[i++]
				}
				if (i < code.length) {
					result += code[i++]
				}
			}
			if (i < code.length) {
				result += code[i++]
			}
		}
		// Line comment
		else if (code[i] === '/' && code[i + 1] === '/') {
			while (i < code.length && code[i] !== '\n') {
				i++
			}
		}
		// Block comment
		else if (code[i] === '/' && code[i + 1] === '*') {
			i += 2
			while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
				i++
			}
			i += 2
		}
		else {
			result += code[i++]
		}
	}
	return result
}
