import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import * as fs from 'node:fs'
import Path from 'node:path'
import os from 'node:os'
import { findNearestFile } from '../forward/pack/utils/find-nearest-file'

describe('findNearestFile', () => {
	let tempDir: string
	let originalCwd: string

	beforeEach(() => {
		originalCwd = process.cwd()
		tempDir = fs.mkdtempSync(Path.join(os.tmpdir(), 'pack-test-'))
	})

	afterEach(() => {
		process.chdir(originalCwd)
		fs.rmSync(tempDir, {
			recursive: true,
			force: true 
		})
	})

	test('finds file in current directory', () => {
		const filePath = Path.join(tempDir, 'README.md')
		fs.writeFileSync(filePath, '# Test')

		const result = findNearestFile('README.md', 2, tempDir)
		expect(result).toBe(filePath)
	})

	test('finds file in parent directory', () => {
		const subDir = Path.join(tempDir, 'sub')
		fs.mkdirSync(subDir)
		const filePath = Path.join(tempDir, 'LICENSE')
		fs.writeFileSync(filePath, 'MIT')

		const result = findNearestFile('LICENSE', 2, subDir)
		expect(result).toBe(filePath)
	})

	test('finds file in grandparent directory', () => {
		const subDir = Path.join(tempDir, 'sub', 'subsub')
		fs.mkdirSync(subDir, { recursive: true })
		const filePath = Path.join(tempDir, 'CONFIG.md')
		fs.writeFileSync(filePath, 'config')

		const result = findNearestFile('CONFIG.md', 2, subDir)
		expect(result).toBe(filePath)
	})

	test('returns null when file not found', () => {
		const result = findNearestFile('nonexistent.txt', 2, tempDir)
		expect(result).toBeNull()
	})

	test('respects maxDepth parameter', () => {
		const subDir = Path.join(tempDir, 'sub', 'subsub')
		fs.mkdirSync(subDir, { recursive: true })
		const filePath = Path.join(tempDir, 'DEEP.md')
		fs.writeFileSync(filePath, 'deep')

		// maxDepth 1 should not find file in grandparent
		const result = findNearestFile('DEEP.md', 1, subDir)
		expect(result).toBeNull()
	})

	test('prefers closer file over distant one', () => {
		const subDir = Path.join(tempDir, 'sub')
		fs.mkdirSync(subDir)

		// Create file in both directories
		fs.writeFileSync(Path.join(tempDir, 'README.md'), 'parent')
		fs.writeFileSync(Path.join(subDir, 'README.md'), 'current')

		const result = findNearestFile('README.md', 2, subDir)
		expect(result).toBe(Path.join(subDir, 'README.md'))
	})
})
