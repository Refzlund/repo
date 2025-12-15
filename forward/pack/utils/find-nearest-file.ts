import * as fs from 'node:fs'
import Path from 'node:path'

/**
 * Find the nearest file by searching current directory and parent directories.
 * @param filename - Name of file to find (e.g., 'README.md')
 * @param maxDepth - Maximum parent directories to search (default: 2)
 * @param cwd - Starting directory (default: process.cwd())
 * @returns Absolute path if found, null otherwise
 */
export function findNearestFile(filename: string, maxDepth = 2, cwd = process.cwd()): string | null {
	const possiblePaths = [
		`./${filename}`,
		`../${filename}`,
		`../../${filename}`
	].slice(0, maxDepth + 1)

	for (const relativePath of possiblePaths) {
		const fullPath = Path.resolve(cwd, relativePath)
		if (fs.existsSync(fullPath)) return fullPath
	}

	return null
}
