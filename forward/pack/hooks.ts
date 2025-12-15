import Bun from 'bun'

export interface HookRunner {
	run: (hook: string | string[] | undefined) => Promise<void>
}

/**
 * Create a hook runner that executes shell commands.
 * Uses cmd /c on Windows, sh -c on Unix.
 */
export function createHookRunner(cwd: string, onProgress?: (command: string) => void): HookRunner {
	async function run(hook: string | string[] | undefined): Promise<void> {
		if (!hook) return

		const commands = Array.isArray(hook) ? hook : [hook]
		for (const command of commands) {
			onProgress?.(command)

			const shellResult = Bun.spawnSync({
				cmd: process.platform === 'win32' ? ['cmd', '/c', command] : ['sh', '-c', command],
				cwd,
				stdout: 'pipe',
				stderr: 'pipe',
				env: { ...process.env }
			})

			if (shellResult.exitCode !== 0) {
				const err = shellResult.stderr.toString().trim()
				throw new Error(`Hook failed: ${command}${err ? `\n${err}` : ''}`)
			}
		}
	}

	return { run }
}

export interface HookCommandResult {
	exitCode: number
	stdout: string
	stderr: string
}

/**
 * Run a single hook command directly (simpler API for testing).
 */
export async function runHookCommand(command: string, cwd: string): Promise<HookCommandResult> {
	const result = Bun.spawnSync({
		cmd: process.platform === 'win32' ? ['cmd', '/c', command] : ['sh', '-c', command],
		cwd,
		stdout: 'pipe',
		stderr: 'pipe',
		env: { ...process.env }
	})

	return {
		exitCode: result.exitCode,
		stdout: result.stdout.toString(),
		stderr: result.stderr.toString()
	}
}
