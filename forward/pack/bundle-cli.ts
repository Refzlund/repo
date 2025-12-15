import Bun from 'bun'
import * as fs from 'node:fs'
import Path from 'node:path'
import type { CliBundleConfig } from './types'

/**
 * Bundle a CLI entry point using Bun.build.
 * Supports shebang insertion, transforms, and chmod on Unix.
 */
export async function bundleCli(config: CliBundleConfig, packageRoot: string, outDirAbs: string): Promise<void> {
	const entryPath = Path.resolve(packageRoot, config.entry)
	const outputPath = Path.resolve(outDirAbs, config.output)
	const outputDir = Path.dirname(outputPath)
	const outputFilename = Path.basename(outputPath)

	if (!fs.existsSync(entryPath)) {
		throw new Error(`CLI entry file does not exist: ${entryPath}`)
	}

	if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

	const result = await Bun.build({
		entrypoints: [entryPath],
		outdir: outputDir,
		naming: outputFilename.replace(/\.js$/, '') + '.[ext]',
		format: config.format === 'cjs' ? 'cjs' : 'esm',
		target: config.platform === 'browser' ? 'browser' : 'node',
		external: config.external || [],
		minify: false
	})

	if (!result.success) {
		const logs = result.logs.map(l => String(l)).join('\n')
		throw new Error(`CLI bundling failed\n${logs}`)
	}

	let content = fs.readFileSync(outputPath, 'utf-8')

	if (config.transforms) {
		for (const transform of config.transforms) {
			if (typeof transform.find === 'string') {
				content = content.split(transform.find).join(transform.replace)
			} else {
				content = content.replace(transform.find, transform.replace)
			}
		}
	}

	if (config.shebang) {
		content = content.replace(/^#!.*\n/gm, '')
		content = '#!/usr/bin/env node\n' + content
	}

	fs.writeFileSync(outputPath, content)

	if (process.platform !== 'win32') {
		fs.chmodSync(outputPath, 0o755)
	}
}

/**
 * Apply transforms to content.
 */
export function applyTransforms(content: string, transforms: CliBundleConfig['transforms']): string {
	if (!transforms) return content

	let result = content
	for (const transform of transforms) {
		if (typeof transform.find === 'string') {
			result = result.split(transform.find).join(transform.replace)
		} else {
			result = result.replace(transform.find, transform.replace)
		}
	}
	return result
}

/**
 * Add shebang to content, removing any existing shebang first.
 */
export function addShebang(content: string, shebang = '#!/usr/bin/env node'): string {
	const withoutShebang = content.replace(/^#!.*\n/gm, '')
	return shebang + '\n' + withoutShebang
}
