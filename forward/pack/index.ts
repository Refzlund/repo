import Bun from 'bun'
import * as fs from 'node:fs'
import Path from 'node:path'
import ora from 'ora'
import 'colors'

import type { PackOptions, SourcePackageJson, OutputPackageJson, PackPaths, CliBundleConfig } from './types'
import { findNearestFile } from './utils/find-nearest-file'
import { copyRecursive, copyDirectory, deleteFilesRecursively, STORY_FILE_PATTERN } from './copy'
import { bundleCli } from './bundle-cli'
import { createHookRunner } from './hooks'
import { createSvelteDependencyChecker } from './svelte-detection'
import { updatePackageJson, getPublishWarnings } from './exports'

// Re-export types and utilities
export type {
	CopyEntry,
	CopyDirEntry,
	CliTransform,
	CliBundleConfig,
	BundleConfig,
	PackHooks,
	PackOptions,
	OutputPackageJson,
	SourcePackageJson,
	PackPaths
} from './types'

export { definePackOptions } from './types'

// Re-export utilities for testing
export { stripComments } from './utils/strip-comments'
export { parseJSONWithComments } from './utils/jsonc'
export { findNearestFile } from './utils/find-nearest-file'
export { normalizeRelPath, computeBinName } from './utils/normalize-path'
export { copyRecursive, copyDirectory, deleteFilesRecursively, STORY_FILE_PATTERN } from './copy'
export { bundleCli, applyTransforms, addShebang } from './bundle-cli'
export { createHookRunner, runHookCommand } from './hooks'
export { createSvelteDependencyChecker, loadTSConfig } from './svelte-detection'
export { rewriteExports, updatePackageJson, getPublishWarnings } from './exports'

/**
 * Main packaging function.
 * Packages a Svelte/SvelteKit library for publishing.
 */
export async function pack(options: PackOptions = {}): Promise<void> {
	const spinner = ora('Packaging ' + '⠧⠴⠳⠦⠸⠒⠳⠴⠧'.blue + ' v'.magenta + '⠸.⠳.⠦'.magenta).start()

	const packageRoot = Path.resolve('.')
	const hookRunner = createHookRunner(packageRoot, (cmd) => {
		spinner.text = `Running hook: ${cmd.cyan}`
	})
	const { hasSvelteDependency } = createSvelteDependencyChecker(Path.resolve('./tsconfig.json'))

	const inputDir = options.input || './src'
	const outDirName = options.outDir || '_package'
	const distDirName = options.distDir || 'dist'

	const readmePath = findNearestFile('README.md')
	const licensePath = findNearestFile('LICENSE')

	const extraFilePaths = (options.extraFiles || []).map(filename => ({
		filename,
		path: findNearestFile(filename)
	}))

	if (!readmePath) {
		console.warn(`${'Warning'.yellow}: Could not find README.md file within ${2} parent directories`.yellow)
	}

	if (!licensePath) {
		console.warn(`${'Warning'.yellow}: Could not find LICENSE file within ${2} parent directories`.yellow)
	}

	for (const { filename, path } of extraFilePaths) {
		if (!path) {
			console.warn(`${'Warning'.yellow}: Could not find ${filename} file within ${2} parent directories`.yellow)
		}
	}

	const paths: PackPaths = {
		package: Path.resolve('./package.json'),
		readme: readmePath || Path.resolve('./README.md'),
		license: licensePath || Path.resolve('./LICENSE'),
		input: Path.resolve(inputDir),
		output: Path.resolve(`./${outDirName}/${distDirName}`),
		_package: Path.resolve(`./${outDirName}`),
		sveltekit: Path.resolve('./.svelte-kit')
	}

	const outDirRel = `${Path.relative(Path.resolve('.'), paths._package)}`

	if (!fs.existsSync(paths.package)) {
		spinner.fail('package.json not found'.red)
		throw new Error('package.json not found in current directory')
	}

	const packageJSON = JSON.parse(fs.readFileSync(paths.package, 'utf-8')) as SourcePackageJson

	const packageName = String(packageJSON.name || '').blue
	const packageVersion = `v${packageJSON.version || '0.0.0'}`.magenta
	spinner.text = `Packaging ${packageName} ${packageVersion}`

	try {
		// 1. hooks.prePack
		await hookRunner.run(options.hooks?.prePack)

		// 2. Clean output directories
		for (const p of [paths._package, paths.sveltekit]) {
			if (fs.existsSync(p)) {
				fs.rmSync(p, {
					recursive: true,
					force: true
				})
			}
		}

		// 3. svelte-kit sync
		spinner.text = `Running svelte-kit sync...`
		const sync = Bun.spawnSync({
			cmd: ['bunx', 'svelte-kit', 'sync'],
			stdout: 'pipe',
			stderr: 'pipe'
		})

		// 4. hooks.postSync
		await hookRunner.run(options.hooks?.postSync)

		// 5. svelte-package
		spinner.text = `Packaging ${packageName} ${packageVersion}`
		const result = Bun.spawnSync({
			cmd: ['bunx', 'svelte-package', '--input', paths.input, '--output', paths.output],
			stdout: 'pipe',
			stderr: 'pipe'
		})

		// 6. hooks.postPackage
		await hookRunner.run(options.hooks?.postPackage)

		// 7. publint
		const lint = Bun.spawnSync({
			cmd: ['bunx', 'publint', paths._package],
			stdout: 'pipe',
			stderr: 'pipe'
		})

		let errors = false
		if (result.stderr.length > 0 || sync.stderr.length > 0 || lint.stderr.length > 0) {
			errors = result.stderr.length > 0

			const prefixErr = '×'.red
			console.log('')

			if (result.stderr.length > 0) {
				spinner.fail('Errors during packaging'.red + ` ${packageName} ${packageVersion}` + ' -> '.gray + outDirRel.italic + ':')
			}

			const prefixate = (str: string, prefix: string = prefixErr) => str
				.split('\n')
				.filter(v => v.length > 1)
				.map(v => v.reset)
				.join('\n' + prefix + '   ')

			const synxError = sync.stderr.toString()
			if (synxError.length > 0) {
				console.log('')
				console.log('svelte-sync'.cyan + ' issues'.yellow + ':'.dim)
				console.log(prefixate(synxError))
			}

			const lintError = lint.stderr.toString()
			if (lintError.length > 0) {
				console.log('')
				console.log('publint'.cyan + ' issues'.yellow + ':'.dim)
				console.log(prefixate(lintError))
			}

			const resultError = result.stderr.toString()
			if (resultError.length > 0) {
				console.log('@sveltejs/package'.cyan + ' error'.red + ':'.dim)
				console.log(prefixate(resultError, prefixErr))
			}

			console.log('')
		}

		const out = result.stdout.toString()
		const svelteExpression = 'You are using Svelte files, but did not declare a `svelte` condition in one of your `exports` in your `package.json`'
		const usesSvelte = out.includes(svelteExpression)

		if (!fs.existsSync(paths.output)) {
			throw new Error(`Error: ${outDirName}/${distDirName} directory was not created.`)
		}

		// 8. Copy standard files
		for (const p of [paths.package, paths.readme, paths.license]) {
			if (fs.existsSync(p)) fs.copyFileSync(p, Path.join(paths._package, Path.basename(p)))
		}

		// 9. Copy extra files
		for (const { filename, path } of extraFilePaths) {
			if (path && fs.existsSync(path)) fs.copyFileSync(path, Path.join(paths._package, filename))
		}

		// 10. Copy directories (granular)
		if (options.copy && options.copy.length > 0) {
			spinner.text = 'Copying directories...'
			for (const entry of options.copy) {
				const fromAbs = Path.resolve(packageRoot, entry.from)
				const toAbs = Path.resolve(paths._package, entry.to)
				await copyRecursive({
					fromRoot: fromAbs,
					toRoot: toAbs,
					exclude: entry.exclude
				})
			}
		}

		// 10b. Copy directories (simplified with remap)
		if (options.copyDir && options.copyDir.length > 0) {
			spinner.text = 'Copying directories...'
			for (const entry of options.copyDir) {
				const fromAbs = Path.resolve(packageRoot, entry.from)
				const toName = entry.to ?? Path.basename(entry.from)
				const toAbs = Path.resolve(paths._package, toName)
				await copyDirectory({
					fromDir: fromAbs,
					toDir: toAbs,
					exclude: entry.exclude,
					remap: entry.remap
				})
			}
		}

		// 11. hooks.postCopy
		await hookRunner.run(options.hooks?.postCopy)

		// 12. Bundle entry points (CLI, workers, etc.)
		// Support both `bundle` (new) and `cli` (deprecated) options
		const bundleConfigs: CliBundleConfig[] = []
		if (options.bundle) {
			if (Array.isArray(options.bundle)) {
				bundleConfigs.push(...options.bundle)
			} else {
				bundleConfigs.push(options.bundle)
			}
		}
		if (options.cli && !options.bundle) {
			// Only use cli if bundle is not set (backward compatibility)
			bundleConfigs.push(options.cli)
		}

		if (bundleConfigs.length > 0) {
			spinner.text = 'Bundling entry points...'
			for (const config of bundleConfigs) {
				await bundleCli(config, packageRoot, paths._package)
			}
		}

		// 13. hooks.postBundle
		await hookRunner.run(options.hooks?.postBundle)

		// 14. Delete .stories.* files from dist
		deleteFilesRecursively(paths.output, STORY_FILE_PATTERN)

		// 15. Update output package.json
		const packagePath = Path.join(paths._package, Path.basename(paths.package))
		const json = JSON.parse(fs.readFileSync(packagePath, 'utf-8')) as OutputPackageJson

		updatePackageJson({
			json,
			distDir: distDirName,
			extraFiles: extraFilePaths.map(({ filename, path }) => ({
				filename,
				exists: !!path && fs.existsSync(Path.join(paths._package, filename))
			})),
			copyEntries: options.copy,
			copyDirEntries: options.copyDir,
			bundleConfigs: bundleConfigs.length > 0 ? bundleConfigs : undefined,
			packageName: String(packageJSON.name || ''),
			usesSvelte,
			svelteChecker: { hasSvelteDependency }
		})

		fs.writeFileSync(packagePath, JSON.stringify(json, null, 4))

		// 16. publishConfig validation (warning only)
		const warnings = getPublishWarnings({
			isPrivate: packageJSON.private === true,
			publishConfigDirectory: packageJSON.publishConfig?.directory,
			expectedOutDir: outDirRel
		})

		if (warnings.length > 0) {
			console.log('')
			console.log('⚠  PUBLISHING CONFIGURATION ISSUES  ⚠'.bgYellow.black.bold)
			console.log(warnings.join('\n'))
			console.log('')
		}

		// 17. hooks.postPack
		await hookRunner.run(options.hooks?.postPack)

		if (!errors) {
			spinner.succeed('Finished packaging '.green + packageName + ' ' + packageVersion + ' -> '.gray + outDirRel.italic)
		} else {
			spinner.stop()
		}
	} catch (err) {
		spinner.fail('Packaging failed'.red)
		throw err
	}
}
