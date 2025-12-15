export interface CopyEntry {
	/** Source path, relative to package root (can use ../) */
	from: string
	/** Destination path, relative to output directory */
	to: string
	/** Glob patterns to exclude */
	exclude?: string[]
}

export interface CopyDirEntry {
	/** Source directory, relative to package root */
	from: string
	/** Destination directory in output (defaults to basename of `from`) */
	to?: string
	/** Glob patterns to exclude */
	exclude?: string[]
	/** Remap specific files/folders to different locations within the destination */
	remap?: Record<string, string>
}

export interface CliTransform {
	/** String or regex pattern to find */
	find: string | RegExp
	/** Replacement string */
	replace: string
}

export interface CliBundleConfig {
	/** Entry file path, relative to package root */
	entry: string
	/** Output file path, relative to the output directory */
	output: string
	/** Output format (default: 'esm') */
	format?: 'esm' | 'cjs'
	/** Target platform (default: 'node') */
	platform?: 'node' | 'browser'
	/** External dependencies (supports patterns like 'node:*') */
	external?: string[]
	/** Add shebang to output (default: false) */
	shebang?: boolean
	/** Post-bundle transforms */
	transforms?: CliTransform[]
	/** If provided, sets/overrides package.json "bin" mapping key */
	binName?: string
	/** Minify the output (default: false) */
	minify?: boolean
}

/** @deprecated Use BundleConfig instead */
export type BundleConfig = CliBundleConfig

export interface PackHooks {
	/** Runs before anything else */
	prePack?: string | string[]
	/** Runs after svelte-kit sync */
	postSync?: string | string[]
	/** Runs after svelte-package (before copying files) */
	postPackage?: string | string[]
	/** Runs after copying directories */
	postCopy?: string | string[]
	/** Runs after CLI bundling */
	postBundle?: string | string[]
	/** Runs after everything is complete */
	postPack?: string | string[]
}

export interface PackOptions {
	/** Input directory for svelte-package (default: './src') */
	input?: string
	/** Output directory name (default: '_package') */
	outDir?: string
	/** Distribution directory name within outDir (default: 'dist') */
	distDir?: string
	/** Additional files to copy to package root (searched up to 2 parent dirs) */
	extraFiles?: string[]
	/** Directories/files to copy into the package (granular control) */
	copy?: CopyEntry[]
	/** Simplified directory copying with optional remapping */
	copyDir?: CopyDirEntry[]
	/** 
	 * Bundle entry points (CLI, workers, etc.)
	 * Supports single config or array for multiple bundles
	 */
	bundle?: CliBundleConfig | CliBundleConfig[]
	/** @deprecated Use `bundle` instead. CLI bundling configuration */
	cli?: CliBundleConfig
	/** Lifecycle hooks */
	hooks?: PackHooks
}

export function definePackOptions(options: PackOptions): PackOptions {
	return options
}

export type OutputPackageJson = Record<string, unknown> & {
	devDependencies?: unknown
	private?: unknown
	publishConfig?: unknown
	files?: string[]
	exports?: Record<string, unknown>
	bin?: string | Record<string, string>
}

export interface SourcePackageJson {
	name: string
	version: string
	private?: boolean
	publishConfig?: { directory?: string }
	exports?: Record<string, unknown>
	bin?: string | Record<string, string>
}

export interface PackPaths {
	package: string
	readme: string
	license: string
	input: string
	output: string
	_package: string
	sveltekit: string
}
