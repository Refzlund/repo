import * as fs from 'node:fs'
import Path from 'node:path'
import picomatch from 'picomatch'
import { normalizeRelPath } from './utils/normalize-path'

export interface CopyOptions {
	/** Source root path (absolute) */
	fromRoot: string
	/** Destination root path (absolute) */
	toRoot: string
	/** Glob patterns to exclude (matched against relative paths) */
	exclude?: string[]
}

/**
 * Recursively copy files/directories with optional glob-based exclusion.
 * Uses picomatch for robust glob pattern matching.
 */
export async function copyRecursive(options: CopyOptions): Promise<void> {
	const { fromRoot, toRoot, exclude = [] } = options

	if (!fs.existsSync(fromRoot)) {
		console.warn(`Warning: Source path does not exist: ${fromRoot}`)
		return
	}

	const stat = fs.statSync(fromRoot)

	const isExcluded = exclude.length > 0
		? picomatch(exclude, { dot: true })
		: () => false

	const ensureDir = (dir: string) => {
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
	}

	const copyFile = (src: string, dest: string) => {
		ensureDir(Path.dirname(dest))
		fs.copyFileSync(src, dest)
	}

	const visit = (current: string) => {
		const rel = normalizeRelPath(Path.relative(fromRoot, current))
		if (rel && isExcluded(rel)) return
		// Also allow directory-like matching for patterns ending with '/**'
		if (rel && isExcluded(rel + '/')) return

		const s = fs.statSync(current)
		const dest = Path.join(toRoot, rel)

		if (s.isDirectory()) {
			ensureDir(dest)
			const entries = fs.readdirSync(current, { withFileTypes: true })
			for (const entry of entries) {
				visit(Path.join(current, entry.name))
			}
			return
		}

		copyFile(current, dest)
	}

	if (stat.isDirectory()) {
		ensureDir(toRoot)
		const entries = fs.readdirSync(fromRoot, { withFileTypes: true })
		for (const entry of entries) {
			visit(Path.join(fromRoot, entry.name))
		}
		return
	}

	// file -> file
	copyFile(fromRoot, toRoot)
}

/**
 * Delete files matching a pattern recursively.
 * Used to remove .stories.* files from the output.
 */
export function deleteFilesRecursively(dir: string, pattern: RegExp): void {
	if (!fs.existsSync(dir)) return

	const entries = fs.readdirSync(dir, { withFileTypes: true })
	for (const entry of entries) {
		const fullPath = Path.join(dir, entry.name)
		if (entry.isDirectory()) {
			deleteFilesRecursively(fullPath, pattern)
		} else if (pattern.test(entry.name)) {
			fs.unlinkSync(fullPath)
		}
	}
}

/**
 * Pattern for story files that should be excluded from published packages.
 */
export const STORY_FILE_PATTERN = /\.stories\.(svelte|ts|js|d\.ts|svelte\.d\.ts)$/
