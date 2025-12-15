import { describe, test, expect } from 'bun:test'
import { stripComments } from '../forward/pack/utils/strip-comments'

describe('stripComments', () => {
	test('removes line comments', () => {
		const input = `const x = 1 // this is a comment
const y = 2`
		const result = stripComments(input)
		expect(result).not.toContain('this is a comment')
		expect(result).toContain('const x = 1')
		expect(result).toContain('const y = 2')
	})

	test('removes block comments', () => {
		const input = `const x = 1 /* block comment */ + 2`
		const result = stripComments(input)
		expect(result).not.toContain('block comment')
		expect(result).toContain('const x = 1')
		expect(result).toContain('+ 2')
	})

	test('removes multi-line block comments', () => {
		const input = `const x = 1
/* 
 * multi-line
 * block comment
 */
const y = 2`
		const result = stripComments(input)
		expect(result).not.toContain('multi-line')
		expect(result).toContain('const x = 1')
		expect(result).toContain('const y = 2')
	})

	test('preserves double-quoted strings containing comment-like content', () => {
		const input = `const str = "// not a comment"`
		const result = stripComments(input)
		expect(result).toContain('"// not a comment"')
	})

	test('preserves single-quoted strings containing comment-like content', () => {
		const input = `const str = '/* not a comment */'`
		const result = stripComments(input)
		expect(result).toContain('\'/* not a comment */\'')
	})

	test('preserves template literals containing comment-like content', () => {
		const input = 'const str = `// not a comment`'
		const result = stripComments(input)
		expect(result).toContain('`// not a comment`')
	})

	test('handles escaped quotes in strings', () => {
		const input = `const str = "he said \\"hello\\""`
		const result = stripComments(input)
		expect(result).toBe(input)
	})

	test('handles empty input', () => {
		expect(stripComments('')).toBe('')
	})

	test('handles input with no comments', () => {
		const input = 'const x = 1'
		expect(stripComments(input)).toBe(input)
	})

	test('handles consecutive comments', () => {
		const input = `// comment 1
// comment 2
const x = 1`
		const result = stripComments(input)
		expect(result).not.toContain('comment 1')
		expect(result).not.toContain('comment 2')
		expect(result).toContain('const x = 1')
	})
})
