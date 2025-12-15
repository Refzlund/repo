import { describe, test, expect } from 'bun:test'
import { rewriteExports, getPublishWarnings } from '../forward/pack/exports'
import type { SvelteDependencyChecker } from '../forward/pack/svelte-detection'

// Mock checker that returns false for all files
const noSvelteChecker: SvelteDependencyChecker = {
	hasSvelteDependency: () => false
}

// Mock checker that returns true for files containing 'svelte' in path
const svelteChecker: SvelteDependencyChecker = {
	hasSvelteDependency: (path) => path.includes('svelte')
}

describe('rewriteExports', () => {
	test('rewrites simple export paths', () => {
		const result = rewriteExports({
			exports: {
				'.': './src/index.ts',
				'./utils': './src/utils/index.ts'
			},
			distDir: 'dist',
			usesSvelte: false,
			svelteChecker: noSvelteChecker
		})

		expect(result['.']).toEqual({
			types: './dist/index.d.ts',
			default: './dist/index.js'
		})
		expect(result['./utils']).toEqual({
			types: './dist/utils/index.d.ts',
			default: './dist/utils/index.js'
		})
	})

	test('adds svelte condition when usesSvelte is true', () => {
		const result = rewriteExports({
			exports: {
				'.': './src/index.ts'
			},
			distDir: 'dist',
			usesSvelte: true,
			svelteChecker: noSvelteChecker
		})

		expect(result['.']).toEqual({
			types: './dist/index.d.ts',
			svelte: './dist/index.js',
			default: './dist/index.js'
		})
	})

	test('adds svelte condition when file has svelte dependency', () => {
		const result = rewriteExports({
			exports: {
				'./svelte-component': './src/svelte-component/index.ts'
			},
			distDir: 'dist',
			usesSvelte: false,
			svelteChecker: svelteChecker
		})

		expect(result['./svelte-component']).toEqual({
			types: './dist/svelte-component/index.d.ts',
			svelte: './dist/svelte-component/index.js'
			// Note: no default when isSvelte is true
		})
	})

	test('preserves non-string export values', () => {
		const complexExport = {
			types: './types/index.d.ts',
			import: './esm/index.js',
			require: './cjs/index.js'
		}

		const result = rewriteExports({
			exports: {
				'.': './src/index.ts',
				'./complex': complexExport
			},
			distDir: 'dist',
			usesSvelte: false,
			svelteChecker: noSvelteChecker
		})

		expect(result['./complex']).toEqual(complexExport)
	})

	test('uses custom distDir', () => {
		const result = rewriteExports({
			exports: {
				'.': './src/index.ts'
			},
			distDir: 'build',
			usesSvelte: false,
			svelteChecker: noSvelteChecker
		})

		expect(result['.']).toEqual({
			types: './build/index.d.ts',
			default: './build/index.js'
		})
	})
})

describe('getPublishWarnings', () => {
	test('returns empty array when config is correct', () => {
		const warnings = getPublishWarnings({
			isPrivate: false,
			publishConfigDirectory: '_package',
			expectedOutDir: '_package'
		})

		expect(warnings).toEqual([])
	})

	test('warns about private: true', () => {
		const warnings = getPublishWarnings({
			isPrivate: true,
			publishConfigDirectory: '_package',
			expectedOutDir: '_package'
		})

		expect(warnings.length).toBeGreaterThan(0)
		expect(warnings.some(w => w.includes('private'))).toBe(true)
	})

	test('warns about incorrect publishConfig.directory', () => {
		const warnings = getPublishWarnings({
			isPrivate: false,
			publishConfigDirectory: 'dist',
			expectedOutDir: '_package'
		})

		expect(warnings.length).toBeGreaterThan(0)
		expect(warnings.some(w => w.includes('publishConfig.directory'))).toBe(true)
	})

	test('warns about missing publishConfig.directory', () => {
		const warnings = getPublishWarnings({
			isPrivate: false,
			publishConfigDirectory: undefined,
			expectedOutDir: '_package'
		})

		expect(warnings.length).toBeGreaterThan(0)
	})

	test('returns multiple warnings when multiple issues', () => {
		const warnings = getPublishWarnings({
			isPrivate: true,
			publishConfigDirectory: undefined,
			expectedOutDir: '_package'
		})

		expect(warnings.length).toBeGreaterThan(3) // Multiple lines for each issue
	})
})
