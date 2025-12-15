import { describe, test, expect } from 'bun:test'
import { normalizeRelPath, computeBinName } from '../forward/pack/utils/normalize-path'

describe('normalizeRelPath', () => {
	test('converts backslashes to forward slashes', () => {
		expect(normalizeRelPath('foo\\bar\\baz')).toBe('foo/bar/baz')
	})

	test('leaves forward slashes unchanged', () => {
		expect(normalizeRelPath('foo/bar/baz')).toBe('foo/bar/baz')
	})

	test('handles mixed slashes', () => {
		expect(normalizeRelPath('foo\\bar/baz\\qux')).toBe('foo/bar/baz/qux')
	})

	test('handles empty string', () => {
		expect(normalizeRelPath('')).toBe('')
	})

	test('handles single path component', () => {
		expect(normalizeRelPath('filename')).toBe('filename')
	})
})

describe('computeBinName', () => {
	test('extracts name from scoped package', () => {
		expect(computeBinName('@scope/my-cli')).toBe('my-cli')
	})

	test('returns unscoped name as-is', () => {
		expect(computeBinName('my-cli')).toBe('my-cli')
	})

	test('handles deeply scoped packages', () => {
		// Unlikely but handles edge case
		expect(computeBinName('@org/sub/package')).toBe('package')
	})

	test('handles empty string', () => {
		expect(computeBinName('')).toBe('')
	})
})
