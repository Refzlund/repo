import { describe, test, expect } from 'bun:test'
import { parseJSONWithComments } from '../forward/pack/utils/jsonc'

describe('parseJSONWithComments', () => {
	test('parses standard JSON', () => {
		const input = '{"name": "test", "version": "1.0.0"}'
		const result = parseJSONWithComments(input)
		expect(result).toEqual({
			name: 'test',
			version: '1.0.0'
		})
	})

	test('removes block comments', () => {
		const input = `{
			/* This is a comment */
			"name": "test"
		}`
		const result = parseJSONWithComments(input)
		expect(result).toEqual({ name: 'test' })
	})

	test('removes line comments', () => {
		const input = `{
			// This is a comment
			"name": "test"
		}`
		const result = parseJSONWithComments(input)
		expect(result).toEqual({ name: 'test' })
	})

	test('handles trailing commas', () => {
		const input = `{
			"name": "test",
			"version": "1.0.0",
		}`
		const result = parseJSONWithComments(input)
		expect(result).toEqual({
			name: 'test',
			version: '1.0.0'
		})
	})

	test('handles trailing commas in arrays', () => {
		const input = `{
			"items": ["a", "b", "c",]
		}`
		const result = parseJSONWithComments(input)
		expect(result).toEqual({ items: ['a', 'b', 'c'] })
	})

	test('returns empty object on invalid JSON', () => {
		const input = 'not valid json'
		const result = parseJSONWithComments(input)
		expect(result).toEqual({})
	})

	test('handles empty input', () => {
		expect(parseJSONWithComments('')).toEqual({})
	})

	test('handles nested objects', () => {
		const input = `{
			"compilerOptions": {
				/* paths config */
				"paths": {
					"$lib/*": ["./src/lib/*"],
				}
			}
		}`
		const result = parseJSONWithComments(input)
		expect(result).toEqual({
			compilerOptions: {
				paths: {
					'$lib/*': ['./src/lib/*']
				}
			}
		})
	})
})
