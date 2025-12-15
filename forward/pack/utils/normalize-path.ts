/**
 * Normalize a path to use forward slashes (for cross-platform glob matching).
 */
export function normalizeRelPath(p: string): string {
	return p.replace(/\\/g, '/')
}

/**
 * Compute bin name from package name.
 * @example computeBinName('@scope/my-cli') => 'my-cli'
 */
export function computeBinName(pkgName: string): string {
	const parts = pkgName.split('/')
	return parts[parts.length - 1] || pkgName
}
