import Path from 'node:path'
import type { OutputPackageJson, CopyEntry, CopyDirEntry, CliBundleConfig } from './types'
import { computeBinName } from './utils/normalize-path'
import type { SvelteDependencyChecker } from './svelte-detection'

export interface RewriteExportsOptions {
	/** The source exports from package.json */
	exports: Record<string, unknown>
	/** Name of the dist directory (e.g., 'dist') */
	distDir: string
	/** Whether svelte-package detected Svelte usage */
	usesSvelte: boolean
	/** Checker to determine if an export has Svelte dependencies */
	svelteChecker: SvelteDependencyChecker
}

/**
 * Rewrite exports from source paths (./src/...) to dist paths (./dist/...).
 * Adds types, svelte, and default conditions as appropriate.
 */
export function rewriteExports(options: RewriteExportsOptions): Record<string, unknown> {
	const { exports, distDir, usesSvelte, svelteChecker } = options
	const result: Record<string, unknown> = {}

	for (const [exportKey, exportValue] of Object.entries(exports)) {
		if (typeof exportValue !== 'string') {
			result[exportKey] = exportValue
			continue
		}

		const distPath = exportValue.replace(/^\.\/src/, `./${distDir}`)
		const sourcePath = Path.resolve(exportValue)
		const isSvelte = svelteChecker.hasSvelteDependency(sourcePath)

		result[exportKey] = {
			types: distPath.replace(/\.ts$/, '.d.ts'),
			...(isSvelte || usesSvelte ? { svelte: distPath.replace(/\.ts$/, '.js') } : {}),
			...(!isSvelte ? { default: distPath.replace(/\.ts$/, '.js') } : {})
		}
	}

	return result
}

export interface UpdatePackageJsonOptions {
	/** The package.json object to update (will be mutated) */
	json: OutputPackageJson
	/** Name of the dist directory */
	distDir: string
	/** Extra files that were copied */
	extraFiles: Array<{
		filename: string
		exists: boolean
	}>
	/** Copy entries that were processed */
	copyEntries?: CopyEntry[]
	/** CopyDir entries that were processed */
	copyDirEntries?: CopyDirEntry[]
	/** Bundle configs if entries were bundled */
	bundleConfigs?: CliBundleConfig[]
	/** Original package name (for bin name computation) */
	packageName: string
	/** Whether svelte-package detected Svelte usage */
	usesSvelte: boolean
	/** Svelte dependency checker */
	svelteChecker: SvelteDependencyChecker
}

/**
 * Update the output package.json with proper files array,
 * rewritten exports, and bin mapping if CLI is bundled.
 */
export function updatePackageJson(options: UpdatePackageJsonOptions): void {
	const {
		json,
		distDir,
		extraFiles,
		copyEntries,
		copyDirEntries,
		bundleConfigs,
		packageName,
		usesSvelte,
		svelteChecker
	} = options

	// Remove dev-only fields
	delete json.devDependencies
	delete json.private
	delete json.publishConfig
	delete json.scripts

	// Helper to add to files array without duplicates (preserves negation patterns)
	const addToFiles = (entry: string) => {
		if (!json.files!.includes(entry)) json.files!.push(entry)
	}

	// Build files array
	json.files ??= []
	addToFiles(distDir)
	addToFiles('LICENSE')
	addToFiles('README.md')

	for (const { filename, exists } of extraFiles) {
		if (exists) addToFiles(filename)
	}

	if (copyEntries) {
		for (const copyEntry of copyEntries) {
			const toPath = copyEntry.to.replace(/^\.\//, '')
			const topLevel = toPath.split(/[/\\]/)[0]
			if (topLevel) addToFiles(topLevel)
		}
	}

	if (copyDirEntries) {
		for (const entry of copyDirEntries) {
			const toName = entry.to ?? Path.basename(entry.from)
			const topLevel = toName.replace(/^\.\//, '').split(/[/\\]/)[0]
			if (topLevel) addToFiles(topLevel)
		}
	}

	// Handle bundle configs (CLI, workers, etc.)
	if (bundleConfigs && bundleConfigs.length > 0) {
		for (const config of bundleConfigs) {
			const outputPath = config.output.startsWith('./') ? config.output : `./${config.output}`

			// Only add to bin if it has a shebang (it's meant to be an executable)
			if (config.shebang) {
				const binName = config.binName || computeBinName(packageName)
				json.bin = {
					...(typeof json.bin === 'object' && json.bin ? json.bin : {}),
					[binName]: outputPath
				}
			}

			const topLevel = outputPath.replace(/^\.\//, '').split(/[/\\]/)[0]
			if (topLevel) addToFiles(topLevel)
		}
	}

	// Note: deduplication is handled by addToFiles helper above

	// Rewrite exports
	if (json.exports && typeof json.exports === 'object') {
		json.exports = rewriteExports({
			exports: json.exports as Record<string, unknown>,
			distDir,
			usesSvelte,
			svelteChecker
		})
	}
}

export interface PublishWarningsOptions {
	/** Whether package.json has private: true */
	isPrivate: boolean
	/** Current publishConfig.directory value */
	publishConfigDirectory?: string
	/** Expected output directory relative path */
	expectedOutDir: string
}

/**
 * Generate warnings about publishing configuration issues.
 */
export function getPublishWarnings(options: PublishWarningsOptions): string[] {
	const warnings: string[] = []

	if (options.isPrivate) {
		warnings.push(
			'private: true is set in package.json.',
			'Changesets will ignore this package and it will not be published.',
			'Set private: false (or remove it) to enable publishing.'
		)
	}

	if (options.publishConfigDirectory !== options.expectedOutDir) {
		warnings.push(
			'publishConfig.directory is missing or incorrect.',
			`It should be set to "${options.expectedOutDir}" in package.json.`,
			`Currently: ${JSON.stringify(options.publishConfigDirectory || undefined)}`,
			'Without this, changesets will publish the source root instead of the build output.'
		)
	}

	return warnings
}
