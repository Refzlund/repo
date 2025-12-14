#!/usr/bin/env bun

import Bun from 'bun'
import * as fs from 'node:fs'
import Path from 'node:path'
import ora from 'ora'
import 'colors'

async function pack() {
	const spinner = ora('Packaging ' + '⠧⠴⠳⠦⠸⠒⠳⠴⠧'.blue + ' v'.magenta + '⠸.⠳.⠦'.magenta).start()

	function findNearestFile(filename: string, maxDepth = 2): string | null {
		const possiblePaths = [
			`./${filename}`,
			`../${filename}`,
			`../../${filename}`
		].slice(0, maxDepth + 1)
		
		for (const relativePath of possiblePaths) {
			const fullPath = Path.resolve(relativePath)
			if (fs.existsSync(fullPath)) {
				return fullPath
			}
		}
		
		return null
	}

	const readmePath = findNearestFile('README.md')
	const licensePath = findNearestFile('LICENSE')

	if (!readmePath) {
		console.warn(`${'Warning'.yellow}: Could not find README.md file within ${2} parent directories`.yellow)
	}

	if (!licensePath) {
		console.warn(`${'Warning'.yellow}: Could not find LICENSE file within ${2} parent directories`.yellow)
	}

	const paths = {
		package: Path.resolve('./package.json'),
		readme: readmePath || Path.resolve('./README.md'),
		license: licensePath || Path.resolve('./LICENSE'),

		input: Path.resolve('./src'),
		output: Path.resolve('./_package/dist'),

		// generated
		_package: Path.resolve('./_package'),
		sveltekit: Path.resolve('./.svelte-kit')
	}

	const _package = `${Path.relative(Path.resolve('.'), paths._package)}`

	// Helper to strip comments from code (preserves strings including template literals)
	function stripComments(code: string): string {
		let result = ''
		let i = 0
		while (i < code.length) {
			// Template literal
			if (code[i] === '`') {
				result += code[i++]
				while (i < code.length && code[i] !== '`') {
					if (code[i] === '\\') { result += code[i++] }
					if (i < code.length) { result += code[i++] }
				}
				if (i < code.length) { result += code[i++] }
			}
			// Double-quoted string
			else if (code[i] === '"') {
				result += code[i++]
				while (i < code.length && code[i] !== '"') {
					if (code[i] === '\\') { result += code[i++] }
					if (i < code.length) { result += code[i++] }
				}
				if (i < code.length) { result += code[i++] }
			}
			// Single-quoted string
			else if (code[i] === '\'') {
				result += code[i++]
				while (i < code.length && code[i] !== '\'') {
					if (code[i] === '\\') { result += code[i++] }
					if (i < code.length) { result += code[i++] }
				}
				if (i < code.length) { result += code[i++] }
			}
			// Line comment
			else if (code[i] === '/' && code[i + 1] === '/') {
				while (i < code.length && code[i] !== '\n') { i++ }
			}
			// Block comment
			else if (code[i] === '/' && code[i + 1] === '*') {
				i += 2
				while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) { i++ }
				i += 2
			}
			else {
				result += code[i++]
			}
		}
		return result
	}

	// Helper to parse JSON with comments (JSONC)
	function parseJSONWithComments(content: string) {
		try {
			// Remove block comments
			let cleaned = content.replace(/\/\*[\s\S]*?\*\//g, '')
			// Remove line comments (but not inside strings)
			cleaned = cleaned.replace(/^(\s*)(\/\/.*)$/gm, '$1')
			// Remove trailing commas before } or ]
			cleaned = cleaned.replace(/,\s*([}\]])/g, '$1')
			return JSON.parse(cleaned)
		} catch {
			return {}
		}
	}

	// Load TSConfig recursively (supports array extends in TS 5.0+)
	function loadTSConfig(configPath: string): Record<string, unknown> {
		if (!fs.existsSync(configPath)) return {}
		const content = fs.readFileSync(configPath, 'utf-8')
		const config = parseJSONWithComments(content)
		
		let extendedConfig: Record<string, unknown> = {}
		const extendsList = Array.isArray(config.extends) ? config.extends : config.extends ? [config.extends] : []
		
		for (const ext of extendsList) {
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
				extendedConfig = {
					...extendedConfig,
					...parentConfig,
					compilerOptions: {
						...(extendedConfig as Record<string, unknown>).compilerOptions as Record<string, unknown>,
						...(parentConfig.compilerOptions as Record<string, unknown>),
						paths: {
							...((extendedConfig as Record<string, unknown>).compilerOptions as Record<string, unknown>)?.paths as Record<string, unknown>,
							...((parentConfig.compilerOptions as Record<string, unknown>)?.paths as Record<string, unknown>)
						}
					}
				}
			}
		}
		
		return {
			...extendedConfig,
			...config,
			compilerOptions: {
				...(extendedConfig.compilerOptions as Record<string, unknown>),
				...config.compilerOptions,
				paths: {
					...((extendedConfig.compilerOptions as Record<string, unknown>)?.paths as Record<string, unknown>),
					...config.compilerOptions?.paths
				},
				baseUrl: config.compilerOptions?.baseUrl || (extendedConfig.compilerOptions as Record<string, unknown>)?.baseUrl
			}
		}
	}

	const tsConfig = loadTSConfig(Path.resolve('./tsconfig.json'))
	const compilerOptions = (tsConfig.compilerOptions || {}) as Record<string, unknown>
	const tsPaths = (compilerOptions.paths || {}) as Record<string, string[]>
	const baseUrl = Path.resolve('.', (compilerOptions.baseUrl as string) || '.')

	function resolveAlias(importPath: string): string | null {
		// Sort aliases by length (longest first) to match most specific first
		const sortedAliases = Object.entries(tsPaths).sort((a, b) => b[0].length - a[0].length)
		
		for (const [alias, aliasPaths] of sortedAliases) {
			const paths = aliasPaths as string[]
			if (!paths || paths.length === 0) continue
			
			const hasWildcard = alias.includes('*')
			
			if (hasWildcard) {
				// Wildcard alias: "$lib/*" -> ["./src/lib/*"]
				const aliasPrefix = alias.replace(/\*$/, '')
				if (importPath.startsWith(aliasPrefix)) {
					const target = paths[0].replace(/\*$/, '')
					const suffix = importPath.slice(aliasPrefix.length)
					return Path.resolve(baseUrl, target, suffix)
				}
			} else {
				// Exact alias: "$lib" -> ["./src/lib"] or "$lib" -> ["./src/lib/index.ts"]
				if (importPath === alias) {
					return Path.resolve(baseUrl, paths[0])
				}
				// Also check if import is alias + subpath (e.g., "$lib/foo" with alias "$lib")
				if (importPath.startsWith(alias + '/')) {
					const suffix = importPath.slice(alias.length + 1)
					return Path.resolve(baseUrl, paths[0], suffix)
				}
			}
		}
		return null
	}

	function hasSvelteExportCondition(obj: unknown): boolean {
		if (!obj || typeof obj !== 'object') return false
		if ('svelte' in obj) return true
		for (const value of Object.values(obj)) {
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
					const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
					// Check for "svelte" field (legacy) or "svelte" condition in exports
					if (pkg.svelte || hasSvelteExportCondition(pkg.exports)) {
						return true
					}
					return false // Found package.json, stop searching
				} catch {
					// ignore error
				}
			}
			if (Path.basename(current) === 'node_modules') return false // Don't go above node_modules
			current = Path.dirname(current)
		}
		return false
	}

	function hasSvelteDependency(filePath: string, visited = new Set<string>()): boolean {
		// Try to resolve the file path first (handles missing extensions)
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

		// Check AFTER resolution if it's a Svelte file
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
		
		// Match static imports/exports and dynamic imports
		const importRegex = /(?:import|export)\s+(?:(?:type\s+)?[\w\s{},*]*\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
		
		let match
		while ((match = importRegex.exec(cleanContent)) !== null) {
			const importPath = match[1] || match[2]
			if (!importPath) continue

			let resolvedPath: string | null = null
			
			// 1. Try Alias
			const aliased = resolveAlias(importPath)
			if (aliased) {
				resolvedPath = aliased
			} 
			// 2. Try Relative
			else if (importPath.startsWith('.')) {
				resolvedPath = Path.resolve(Path.dirname(resolvedFilePath), importPath)
			} 
			// 3. Try Bun Resolve (handles node_modules and extensions)
			else {
				try {
					resolvedPath = Bun.resolveSync(importPath, Path.dirname(resolvedFilePath))
				} catch {
					// ignore
				}
			}

			// If we have a path (either from alias or relative), we might still need to resolve extensions/indices
			// Bun.resolveSync can do this if we pass the absolute path
			if (resolvedPath && !resolvedPath.includes('node_modules')) {
				try {
					resolvedPath = Bun.resolveSync(resolvedPath, Path.dirname(resolvedFilePath))
				} catch {
					// fallback to manual extension check if Bun fails on absolute path (unlikely)
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

	// Get package name from package.json
	const packageJSON = JSON.parse(fs.readFileSync(paths.package, 'utf-8'))
	const { name, version, publishConfig = { directory: undefined } } = packageJSON as {
		name: string
		version: string
		publishConfig: {
			directory: string | undefined
		}
	}

	const packageName = name.blue
	const packageVersion = `v${version}`.magenta
	spinner.text = `Packaging ${packageName} ${packageVersion}`

	// Delete files used for building/results of building
	for (const path of [paths._package, paths.sveltekit]) {
		if (fs.existsSync(path)) {
			fs.rmSync(path, {
				recursive: true,
				force: true 
			})
		}
	}

	const sync = Bun.spawnSync({
		cmd: ['bunx', 'svelte-kit', 'sync'],
		stdout: 'pipe',
		stderr: 'pipe'
	})

	const result = Bun.spawnSync({
		cmd: ['bunx', 'svelte-package', '--input', paths.input, '--output', paths.output],
		stdout: 'pipe',
		stderr: 'pipe'
	})

	const lint = Bun.spawnSync({
		cmd: ['bunx', 'publint', paths._package],
		stdout: 'pipe',
		stderr: 'pipe'
	})
	
	let errors = false
	if (result.stderr.length > 0 || sync.stderr.length > 0 || lint.stderr.length > 0) {
		
		const prefixErr = '×'.red
		console.log('')

		if(result.stderr.length > 0) {
			errors = true
			spinner.fail('Errors during packaging'.red + ` ${packageName} ${packageVersion}` + ' -> '.gray + _package.italic + ':')
		}

		const prefixate = (str: string, prefix: string = prefixErr) => str
			.split('\n')
			.filter(v => v.length > 1)
			.map(v => v.reset)
			.join('\n' + prefix + '   ')

		const synxError = sync.stderr.toString()
		if(synxError.length > 0) {
			console.log('')
			console.log('svelte-sync'.cyan + ' issues'.yellow + ':'.dim)
			console.log(prefixate(synxError))
		}
		const lintError = lint.stderr.toString()
		if(lintError.length > 0) {
			console.log('')
			console.log('publint'.cyan + ' issues'.yellow + ':'.dim)
			console.log(prefixate(lintError))
		}
		const resultError = result.stderr.toString()
		if(resultError.length > 0) {
			console.log('@sveltejs/package'.cyan + ' error'.red + ':'.dim)
			console.log(prefixate(resultError, prefixErr))
		}
		
		console.log('')
	}

	const out = result.stdout.toString()

	const svelteExpression = 'You are using Svelte files, but did not declare a `svelte` condition in one of your `exports` in your `package.json`'
	const usesSvelte = out.includes(svelteExpression)

	const issues = out.split('\n').filter(v => v !== '' && !/\w+ -> \w+/.test(v) && !v.includes(svelteExpression))

	if(issues.length > 1) {
		issues[0].replace('@sveltejs/package found', 'Found')
		console.log(issues.join('\n'))
	}

	if (!fs.existsSync(paths.output)) {
		console.error('Error: _package/dist directory was not created.')
		return
	}

	// Copy files
	for (const path of [paths.package, paths.readme, paths.license]) {
		fs.copyFileSync(path, Path.join(paths._package, Path.basename(path)))
	}

	// Delete .stories. files recursively
	function deleteStoryFilesRecursively(dir: string) {
		const entries = fs.readdirSync(dir, { withFileTypes: true })
		for (const entry of entries) {
			const fullPath = Path.join(dir, entry.name)
			if (entry.isDirectory()) {
				deleteStoryFilesRecursively(fullPath)
			} else if (/\.stories\.(svelte|ts|js|d\.ts|svelte\.d\.ts)$/.test(entry.name)) {
				fs.unlinkSync(fullPath)
			}
		}
	}
	deleteStoryFilesRecursively(paths.output)

	// Delete unncessary dir
	for (const path of [paths.sveltekit]) {
		if (fs.existsSync(path)) {
			fs.rmSync(path, {
				recursive: true,
				force: true 
			})
		}
	}

	// Update package.json
	const packagePath = Path.join(paths._package, Path.basename(paths.package))

	const json = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
	delete json.devDependencies
	delete json.private
	delete json.publishConfig

	json.files ??= []
	json.files.push(
		'dist',
		'LICENSE',
		'README.md'
	)

	// Ensure only unique keys in json.files
	json.files = [...new Set(json.files)]

	for (const [exportKey, exportValue] of Object.entries(json.exports)) {
		// Skip if the export is already a conditional object (not a simple string path)
		if (typeof exportValue !== 'string') continue
		
		const distPath = exportValue.replace(/^\.\/src/, './dist')
		const sourcePath = Path.resolve(exportValue)
		const isSvelte = hasSvelteDependency(sourcePath)

		json.exports[exportKey] = {
			types: distPath.replace(/\.ts$/, '.d.ts')
		}

		if (!isSvelte) {
			json.exports[exportKey].default = distPath.replace(/\.ts$/, '.js')
		}

		if (usesSvelte || isSvelte) {
			json.exports[exportKey].svelte = distPath.replace(/\.ts$/, '.js')
		}
	}

	fs.writeFileSync(packagePath, JSON.stringify(json, null, 4))

	if(!errors) {
		spinner.succeed('Finished packaging '.green + packageName + ' ' + packageVersion + ' -> '.gray + _package.italic)
	}

	if(publishConfig.directory !== _package) {
		console.log(`${'Warning'.yellow}: package.json's ${'publishConfig.directory'.cyan} !== ${_package.italic}`)
	}
}

pack()