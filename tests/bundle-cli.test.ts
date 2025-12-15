import { describe, test, expect } from 'bun:test'
import { applyTransforms, addShebang } from '../forward/pack/bundle-cli'

describe('applyTransforms', () => {
	test('applies string replacement', () => {
		const content = 'const foo = "bar"'
		const transforms = [
			{
				find: 'bar',
				replace: 'baz' 
			}
		]

		const result = applyTransforms(content, transforms)
		expect(result).toBe('const foo = "baz"')
	})

	test('applies regex replacement', () => {
		const content = 'foo123bar456'
		const transforms = [
			{
				find: /\d+/g,
				replace: 'X' 
			}
		]

		const result = applyTransforms(content, transforms)
		expect(result).toBe('fooXbarX')
	})

	test('applies multiple transforms in order', () => {
		const content = 'hello world'
		const transforms = [
			{
				find: 'hello',
				replace: 'hi' 
			},
			{
				find: 'world',
				replace: 'there' 
			}
		]

		const result = applyTransforms(content, transforms)
		expect(result).toBe('hi there')
	})

	test('returns original content when no transforms', () => {
		const content = 'unchanged'
		expect(applyTransforms(content, undefined)).toBe(content)
		expect(applyTransforms(content, [])).toBe(content)
	})

	test('replaces all occurrences with string find', () => {
		const content = 'foo foo foo'
		const transforms = [
			{
				find: 'foo',
				replace: 'bar' 
			}
		]

		const result = applyTransforms(content, transforms)
		expect(result).toBe('bar bar bar')
	})
})

describe('addShebang', () => {
	test('adds shebang to content', () => {
		const content = 'console.log("hello")'
		const result = addShebang(content)

		expect(result).toBe('#!/usr/bin/env node\nconsole.log("hello")')
	})

	test('replaces existing shebang', () => {
		const content = '#!/usr/bin/env bun\nconsole.log("hello")'
		const result = addShebang(content)

		expect(result).toBe('#!/usr/bin/env node\nconsole.log("hello")')
		expect(result).not.toContain('bun')
	})

	test('uses custom shebang', () => {
		const content = 'code'
		const result = addShebang(content, '#!/usr/bin/env bun')

		expect(result).toBe('#!/usr/bin/env bun\ncode')
	})

	test('removes multiple shebangs', () => {
		const content = '#!/bin/sh\n#!/usr/bin/node\ncode'
		const result = addShebang(content)

		expect(result).toBe('#!/usr/bin/env node\ncode')
	})
})
