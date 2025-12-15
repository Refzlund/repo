import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import * as fs from 'node:fs'
import Path from 'node:path'
import os from 'node:os'
import { createHookRunner, runHookCommand } from '../forward/pack/hooks'

describe('createHookRunner', () => {
	let tempDir: string

	beforeEach(() => {
		tempDir = fs.mkdtempSync(Path.join(os.tmpdir(), 'pack-hooks-test-'))
	})

	afterEach(() => {
		fs.rmSync(tempDir, {
			recursive: true,
			force: true 
		})
	})

	test('runs a single command', async () => {
		const runner = createHookRunner(tempDir)

		// Create a file via hook
		const cmd = process.platform === 'win32'
			? 'echo hello > test.txt'
			: 'echo hello > test.txt'

		await runner.run(cmd)

		expect(fs.existsSync(Path.join(tempDir, 'test.txt'))).toBe(true)
	})

	test('runs multiple commands in sequence', async () => {
		const runner = createHookRunner(tempDir)

		const cmds = process.platform === 'win32'
			? ['echo 1 > first.txt', 'echo 2 > second.txt']
			: ['echo 1 > first.txt', 'echo 2 > second.txt']

		await runner.run(cmds)

		expect(fs.existsSync(Path.join(tempDir, 'first.txt'))).toBe(true)
		expect(fs.existsSync(Path.join(tempDir, 'second.txt'))).toBe(true)
	})

	test('calls progress callback', async () => {
		const progress: string[] = []
		const runner = createHookRunner(tempDir, (cmd) => progress.push(cmd))

		const cmds = ['echo 1', 'echo 2']
		await runner.run(cmds)

		expect(progress).toEqual(['echo 1', 'echo 2'])
	})

	test('does nothing with undefined hook', async () => {
		const runner = createHookRunner(tempDir)
		await runner.run(undefined)
		// Should not throw
	})

	test('throws on failed command', async () => {
		const runner = createHookRunner(tempDir)

		const badCmd = process.platform === 'win32'
			? 'exit 1'
			: 'exit 1'

		await expect(runner.run(badCmd)).rejects.toThrow('Hook failed')
	})
})

describe('runHookCommand', () => {
	let tempDir: string

	beforeEach(() => {
		tempDir = fs.mkdtempSync(Path.join(os.tmpdir(), 'pack-hook-cmd-test-'))
	})

	afterEach(() => {
		fs.rmSync(tempDir, {
			recursive: true,
			force: true 
		})
	})

	test('returns stdout', async () => {
		const result = await runHookCommand('echo hello', tempDir)
		expect(result.stdout.trim()).toBe('hello')
		expect(result.exitCode).toBe(0)
	})

	test('returns stderr on error', async () => {
		// Try to access a non-existent file
		const cmd = process.platform === 'win32'
			? 'type nonexistent.txt'
			: 'cat nonexistent.txt'

		const result = await runHookCommand(cmd, tempDir)
		expect(result.exitCode).not.toBe(0)
		expect(result.stderr.length).toBeGreaterThan(0)
	})

	test('returns exit code', async () => {
		const cmd = process.platform === 'win32'
			? 'cmd /c exit 42'
			: 'exit 42'

		const result = await runHookCommand(cmd, tempDir)
		expect(result.exitCode).toBe(42)
	})
})
