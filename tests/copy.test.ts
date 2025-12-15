import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import * as fs from 'node:fs'
import Path from 'node:path'
import os from 'node:os'
import { copyRecursive, deleteFilesRecursively, STORY_FILE_PATTERN } from '../forward/pack/copy'

describe('copyRecursive', () => {
	let tempDir: string
	let sourceDir: string
	let destDir: string

	beforeEach(() => {
		tempDir = fs.mkdtempSync(Path.join(os.tmpdir(), 'pack-copy-test-'))
		sourceDir = Path.join(tempDir, 'source')
		destDir = Path.join(tempDir, 'dest')
		fs.mkdirSync(sourceDir, { recursive: true })
	})

	afterEach(() => {
		fs.rmSync(tempDir, {
			recursive: true,
			force: true 
		})
	})

	test('copies a single file', async () => {
		fs.writeFileSync(Path.join(sourceDir, 'file.txt'), 'content')

		await copyRecursive({
			fromRoot: sourceDir,
			toRoot: destDir
		})

		expect(fs.existsSync(Path.join(destDir, 'file.txt'))).toBe(true)
		expect(fs.readFileSync(Path.join(destDir, 'file.txt'), 'utf-8')).toBe('content')
	})

	test('copies nested directories', async () => {
		fs.mkdirSync(Path.join(sourceDir, 'sub', 'deep'), { recursive: true })
		fs.writeFileSync(Path.join(sourceDir, 'sub', 'deep', 'file.txt'), 'deep content')

		await copyRecursive({
			fromRoot: sourceDir,
			toRoot: destDir
		})

		expect(fs.existsSync(Path.join(destDir, 'sub', 'deep', 'file.txt'))).toBe(true)
	})

	test('excludes files matching glob patterns', async () => {
		fs.writeFileSync(Path.join(sourceDir, 'keep.txt'), 'keep')
		fs.writeFileSync(Path.join(sourceDir, 'exclude.test.ts'), 'test')

		await copyRecursive({
			fromRoot: sourceDir,
			toRoot: destDir,
			exclude: ['*.test.ts']
		})

		expect(fs.existsSync(Path.join(destDir, 'keep.txt'))).toBe(true)
		expect(fs.existsSync(Path.join(destDir, 'exclude.test.ts'))).toBe(false)
	})

	test('excludes nested files matching glob patterns', async () => {
		fs.mkdirSync(Path.join(sourceDir, 'sub'), { recursive: true })
		fs.writeFileSync(Path.join(sourceDir, 'sub', 'file.stories.ts'), 'story')
		fs.writeFileSync(Path.join(sourceDir, 'sub', 'file.ts'), 'code')

		await copyRecursive({
			fromRoot: sourceDir,
			toRoot: destDir,
			exclude: ['**/*.stories.*']
		})

		expect(fs.existsSync(Path.join(destDir, 'sub', 'file.ts'))).toBe(true)
		expect(fs.existsSync(Path.join(destDir, 'sub', 'file.stories.ts'))).toBe(false)
	})

	test('handles empty source directory', async () => {
		await copyRecursive({
			fromRoot: sourceDir,
			toRoot: destDir
		})

		expect(fs.existsSync(destDir)).toBe(true)
		expect(fs.readdirSync(destDir)).toEqual([])
	})

	test('handles non-existent source gracefully', async () => {
		// Should not throw, just warn
		await copyRecursive({
			fromRoot: Path.join(tempDir, 'nonexistent'),
			toRoot: destDir
		})
	})
})

describe('deleteFilesRecursively', () => {
	let tempDir: string

	beforeEach(() => {
		tempDir = fs.mkdtempSync(Path.join(os.tmpdir(), 'pack-delete-test-'))
	})

	afterEach(() => {
		fs.rmSync(tempDir, {
			recursive: true,
			force: true 
		})
	})

	test('deletes files matching pattern', () => {
		fs.writeFileSync(Path.join(tempDir, 'keep.ts'), 'keep')
		fs.writeFileSync(Path.join(tempDir, 'Button.stories.ts'), 'story')

		deleteFilesRecursively(tempDir, STORY_FILE_PATTERN)

		expect(fs.existsSync(Path.join(tempDir, 'keep.ts'))).toBe(true)
		expect(fs.existsSync(Path.join(tempDir, 'Button.stories.ts'))).toBe(false)
	})

	test('deletes nested files matching pattern', () => {
		fs.mkdirSync(Path.join(tempDir, 'components'), { recursive: true })
		fs.writeFileSync(Path.join(tempDir, 'components', 'Input.stories.svelte'), 'story')
		fs.writeFileSync(Path.join(tempDir, 'components', 'Input.svelte'), 'component')

		deleteFilesRecursively(tempDir, STORY_FILE_PATTERN)

		expect(fs.existsSync(Path.join(tempDir, 'components', 'Input.svelte'))).toBe(true)
		expect(fs.existsSync(Path.join(tempDir, 'components', 'Input.stories.svelte'))).toBe(false)
	})

	test('handles various story file extensions', () => {
		const storyFiles = [
			'Component.stories.ts',
			'Component.stories.js',
			'Component.stories.svelte',
			'Component.stories.d.ts',
			'Component.stories.svelte.d.ts'
		]

		for (const file of storyFiles) {
			fs.writeFileSync(Path.join(tempDir, file), 'content')
		}

		deleteFilesRecursively(tempDir, STORY_FILE_PATTERN)

		for (const file of storyFiles) {
			expect(fs.existsSync(Path.join(tempDir, file))).toBe(false)
		}
	})

	test('handles non-existent directory gracefully', () => {
		// Should not throw
		deleteFilesRecursively(Path.join(tempDir, 'nonexistent'), STORY_FILE_PATTERN)
	})
})
