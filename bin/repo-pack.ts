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
		cmd: ['bunx', 'publint'],
		stdout: 'pipe',
		stderr: 'pipe'
	})
	
	let errors = false
	if (result.stderr.length > 0 || sync.stderr.length > 0 || lint.stderr.length > 0) {
		errors = true
		const prefix = '×'.red + '   '
		const errorSources = [sync.stderr, result.stderr, lint.stderr]
		const errorMessage = errorSources
			.map(e => e.toString())
			.join('')
			.split('\n')
			.filter(v => v.length > 1)
			.map(v => v.reset)
			.join('\n' + prefix)

		spinner.fail('Errors during packaging'.red + ` ${packageName} ${packageVersion}` + ' -> '.gray + _package.italic + ':')
		console.error('\n' + prefix + errorMessage)
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

	for (const [key, path] of Object.entries(json.exports) as [string, string][]) {
		const p = path.replace(/^\.\/src/, './dist')
		json.exports[key] = {
			types: p.replace(/\.ts$/, '.d.ts'),
			default: p.replace(/\.ts$/, '.js')
		}

		if(usesSvelte) {
			json.exports[key]['svelte'] = p.replace(/\.ts$/, '.js')
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