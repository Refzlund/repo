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

export interface CopyDirOptions {
	/** Source directory (absolute) */
	fromDir: string
	/** Destination directory (absolute) */
	toDir: string
	/** Glob patterns to exclude */
	exclude?: string[]
	/** Remap specific files/folders to different locations */
	remap?: Record<string, string>
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

/**
 * Copy a directory with optional remapping support.
 * Files can be remapped to different locations within the destination.
 */
export async function copyDirectory(options: CopyDirOptions): Promise<void> {
	const { fromDir, toDir, exclude = [], remap = {} } = options

	if (!fs.existsSync(fromDir)) {
		console.warn(`Warning: Source directory does not exist: ${fromDir}`)
		return
	}

	const stat = fs.statSync(fromDir)
	if (!stat.isDirectory()) {
		console.warn(`Warning: Source is not a directory: ${fromDir}`)
		return
	}

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

	// Normalize remap keys for consistent matching
	const normalizedRemap: Record<string, string> = {}
	for (const [from, to] of Object.entries(remap)) {
		normalizedRemap[normalizeRelPath(from)] = to
	}

	const visit = (current: string) => {
		const rel = normalizeRelPath(Path.relative(fromDir, current))
		if (!rel) return

		// Check if excluded
		if (isExcluded(rel) || isExcluded(rel + '/')) return

		const s = fs.statSync(current)

		// Check for remap
		const remappedTo = normalizedRemap[rel]

		if (s.isDirectory()) {
			// If this directory is remapped, copy the whole thing to the new location
			if (remappedTo !== undefined) {
				const destPath = Path.join(toDir, remappedTo)
				copyRecursive({
					fromRoot: current,
					toRoot: destPath,
					exclude
				})
				return // Don't descend further, we copied the whole subtree
			}

			// Normal directory traversal
			const destDir = Path.join(toDir, rel)
			ensureDir(destDir)
			const entries = fs.readdirSync(current, { withFileTypes: true })
			for (const entry of entries) {
				visit(Path.join(current, entry.name))
			}
			return
		}

		// File
		const destRel = remappedTo !== undefined ? remappedTo : rel
		const dest = Path.join(toDir, destRel)
		copyFile(current, dest)
	}

	ensureDir(toDir)
	const entries = fs.readdirSync(fromDir, { withFileTypes: true })
	for (const entry of entries) {
		visit(Path.join(fromDir, entry.name))
	}
}
