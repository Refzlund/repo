import Bun from 'bun'
import * as fs from 'node:fs'
import Path from 'node:path'
import { parseJSONWithComments } from './utils/jsonc'
import { stripComments } from './utils/strip-comments'

/**
 * Load a tsconfig.json file with support for:
 * - JSONC (comments)
 * - extends (single or array)
 * - Recursive resolution
 */
export function loadTSConfig(configPath: string): Record<string, unknown> {
	if (!fs.existsSync(configPath)) return {}
	const content = fs.readFileSync(configPath, 'utf-8')
	const config = parseJSONWithComments(content)

	let extendedConfig: Record<string, unknown> = {}
	const extendsRaw = config.extends
	const extendsList = Array.isArray(extendsRaw)
		? (extendsRaw as unknown[])
		: extendsRaw
			? [extendsRaw]
			: []

	for (const ext of extendsList) {
		if (typeof ext !== 'string') continue
		let extendsPath = ext
		if (extendsPath.startsWith('.')) {
			extendsPath = Path.resolve(Path.dirname(configPath), extendsPath)
		} else {
			try {
				extendsPath = Bun.resolveSync(extendsPath, Path.dirname(configPath))
			} catch {
				continue
			}
		}

		if (extendsPath && fs.existsSync(extendsPath)) {
			const parentConfig = loadTSConfig(extendsPath)
			const eCompiler = (extendedConfig.compilerOptions || {}) as Record<string, unknown>
			const pCompiler = (parentConfig.compilerOptions || {}) as Record<string, unknown>
			extendedConfig = {
				...extendedConfig,
				...parentConfig,
				compilerOptions: {
					...eCompiler,
					...pCompiler,
					paths: {
						...(eCompiler.paths as Record<string, unknown> | undefined),
						...(pCompiler.paths as Record<string, unknown> | undefined)
					}
				}
			}
		}
	}

	const eCompiler = (extendedConfig.compilerOptions || {}) as Record<string, unknown>
	const cCompiler = (config.compilerOptions || {}) as Record<string, unknown>

	return {
		...extendedConfig,
		...config,
		compilerOptions: {
			...eCompiler,
			...cCompiler,
			paths: {
				...(eCompiler.paths as Record<string, unknown> | undefined),
				...(cCompiler.paths as Record<string, unknown> | undefined)
			},
			baseUrl: (cCompiler.baseUrl as string) || (eCompiler.baseUrl as string)
		}
	}
}

export interface SvelteDependencyChecker {
	hasSvelteDependency: (filePath: string, visited?: Set<string>) => boolean
}

/**
 * Create a Svelte dependency checker that can determine if a file
 * has Svelte dependencies by scanning imports recursively.
 */
export function createSvelteDependencyChecker(tsconfigPath: string): SvelteDependencyChecker {
	const tsConfig = loadTSConfig(tsconfigPath)
	const compilerOptions = (tsConfig.compilerOptions || {}) as Record<string, unknown>
	const tsPaths = (compilerOptions.paths || {}) as Record<string, string[]>
	const baseUrl = Path.resolve('.', (compilerOptions.baseUrl as string) || '.')

	function resolveAlias(importPath: string): string | null {
		const sortedAliases = Object.entries(tsPaths).sort((a, b) => b[0].length - a[0].length)
		for (const [alias, aliasPaths] of sortedAliases) {
			if (!aliasPaths || aliasPaths.length === 0) continue
			const hasWildcard = alias.includes('*')
			if (hasWildcard) {
				const aliasPrefix = alias.replace(/\*$/, '')
				if (importPath.startsWith(aliasPrefix)) {
					const target = aliasPaths[0].replace(/\*$/, '')
					const suffix = importPath.slice(aliasPrefix.length)
					return Path.resolve(baseUrl, target, suffix)
				}
			} else {
				if (importPath === alias) {
					return Path.resolve(baseUrl, aliasPaths[0])
				}
				if (importPath.startsWith(alias + '/')) {
					const suffix = importPath.slice(alias.length + 1)
					return Path.resolve(baseUrl, aliasPaths[0], suffix)
				}
			}
		}
		return null
	}

	function hasSvelteExportCondition(obj: unknown): boolean {
		if (!obj || typeof obj !== 'object') return false
		if ('svelte' in (obj as Record<string, unknown>)) return true
		for (const value of Object.values(obj as Record<string, unknown>)) {
			if (hasSvelteExportCondition(value)) return true
		}
		return false
	}

	function isSveltePackage(filePath: string): boolean {
		let current = Path.dirname(filePath)
		while (current !== Path.parse(current).root) {
			const pkgPath = Path.join(current, 'package.json')
			if (fs.existsSync(pkgPath)) {
				try {
					const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>
					if (pkg.svelte || hasSvelteExportCondition(pkg.exports)) return true
					return false
				} catch {
					// ignore
				}
			}
			if (Path.basename(current) === 'node_modules') return false
			current = Path.dirname(current)
		}
		return false
	}

	function hasSvelteDependency(filePath: string, visited = new Set<string>()): boolean {
		let resolvedFilePath = filePath
		if (!fs.existsSync(filePath)) {
			try {
				resolvedFilePath = Bun.resolveSync(filePath, Path.dirname(filePath))
			} catch {
				return false
			}
		}

		if (visited.has(resolvedFilePath)) return false
		visited.add(resolvedFilePath)

		if (/\.svelte(\.ts|\.js)?$/.test(resolvedFilePath)) return true
		if (!fs.existsSync(resolvedFilePath)) return false

		if (fs.statSync(resolvedFilePath).isDirectory()) {
			const indices = ['index.ts', 'index.js', 'index.svelte', 'index.svelte.ts', 'index.svelte.js']
			for (const index of indices) {
				const indexPath = Path.join(resolvedFilePath, index)
				if (fs.existsSync(indexPath)) {
					if (hasSvelteDependency(indexPath, visited)) return true
				}
			}
			return false
		}

		const content = fs.readFileSync(resolvedFilePath, 'utf-8')
		const cleanContent = stripComments(content)
		const importRegex = /(?:import|export)\s+(?:(?:type\s+)?[\w\s{},*]*\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g

		let match: RegExpExecArray | null
		while ((match = importRegex.exec(cleanContent)) !== null) {
			const importPath = match[1] || match[2]
			if (!importPath) continue

			let resolvedPath: string | null = null
			const aliased = resolveAlias(importPath)
			if (aliased) {
				resolvedPath = aliased
			} else if (importPath.startsWith('.')) {
				resolvedPath = Path.resolve(Path.dirname(resolvedFilePath), importPath)
			} else {
				try {
					resolvedPath = Bun.resolveSync(importPath, Path.dirname(resolvedFilePath))
				} catch {
					// ignore
				}
			}

			if (resolvedPath && !resolvedPath.includes('node_modules')) {
				try {
					resolvedPath = Bun.resolveSync(resolvedPath, Path.dirname(resolvedFilePath))
				} catch {
					// ignore
				}
			}

			if (resolvedPath) {
				if (resolvedPath.includes('node_modules')) {
					if (isSveltePackage(resolvedPath)) return true
				} else {
					if (hasSvelteDependency(resolvedPath, visited)) return true
				}
			}
		}

		return false
	}

	return { hasSvelteDependency }
}
