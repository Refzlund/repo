#!/usr/bin/env bun

import { fileURLToPath, spawn } from 'bun'
import ora from 'ora'
import 'colors'
import path from 'path'
import { parseArgs } from 'util'

function keypress() {
	return new Promise<string>((resolve) => {
		process.stdin.setRawMode(true)
		process.stdin.setEncoding('utf8')

		process.stdin
			.once('data', data => {
				process.stdin.pause()
				resolve(`${data || ''}`)
			})
			.resume()
	})
} 

const { values } = parseArgs({
	args: Bun.argv,
	options: {
		// --normal
		/** Do not use fancy formatting when running Storybook */
		normal: {
			type: 'boolean',
			short: 'n',
			default: false
		}
	},
	allowPositionals: true
})

const storybookConfigDir = path.join(fileURLToPath(import.meta.url), '../../.storybook')
const subprocess = spawn({
	cmd: [
		...`bun --bun storybook dev -p 6006 --no-open --disable-telemetry --config-dir`.split(' '),
		storybookConfigDir
	],
	stdout: 'pipe',
	stdin: 'pipe'
})

let version = '0.0.0'
let text = '...'

const storybook = 'Storybook'.yellow.bold as unknown as string

const book = {
	interval: 100,
	frames: [
		'⎺',
		'⎻',
		'⎼',
		'⎽',
		'⎼',
		'⎽',
		'⎽',
		'⦟',
		'∠',
		'∟',
		'⦦',
		'⎽',
		'⎽',
		'⎽'.gray,
		'⎽'.gray.italic
	]
}

const spinner = ora({
	text: ` ${storybook} ${version} starting: ${text}`,
	color: 'yellow',
	discardStdin: false,
	spinner: book
})

if(!values.normal) {
	spinner.start()
}

console.clear()
console.log('')

function removeFormat(str: string) {
	/* eslint-disable-next-line no-control-regex */
	return str.replaceAll(/\u001B\[[0-9;]*m/g, '')
}

const decoder = new TextDecoder()
const warnings = [] as string[]
const incompatibles = [] as string[]

for await (const line of subprocess.stdout) {
	if(values.normal) {
		console.log(decoder.decode(line))
		const port = decoder.decode(line).match(/Port (\d+) is not available/im)
		if(port) {
			const key = await keypress()
			subprocess.stdin.write(`${key}\n`)
			subprocess.stdin.flush()
			subprocess.stdin.end()
		}
		continue
	}

	const str = removeFormat(decoder.decode(line))
	
	const port = str.match(/\? Port (\d+) is not available/im)
	if(port) {
		const alt = str.match(/port (\d+) instead/im) || []
		// »
		spinner.spinner = 'arc'
		spinner.color = 'blue'
		spinner.text = ` ${storybook} ${version}: ` + `Port ${port[1].blue} is not available` + ' — '.gray + `Use port ${alt[1].blue} instead?` + ' ⩺ (Y/n)'.gray
		
		let key: string | undefined
		do {
			key = await keypress()
		} while(['y', 'n', ''].includes(key.toLowerCase()) === false)

		if(key === 'n') {
			spinner.fail(` ${storybook} ${version} ` + `was cancelled.`.red)
			process.exit(1)
		}

		spinner.spinner = book
		spinner.color = 'yellow'

		spinner.text = ` ${storybook} ${version}: ${'✓'.green} Using port ${alt[1].blue} instead`

		subprocess.stdin.write('y\n')
		subprocess.stdin.flush()
		subprocess.stdin.end()

		await new Promise(resolve => setTimeout(resolve, 1000))
	}

	const err = str.match(/(Original error:\s*\n+((.|\n)+)$)|(Error: ((.|\n)+)$)/im)
	if(err) {
		spinner.fail(` ${storybook} ${version} ${'failed'.red}:\n${err[2] ?? err[4]}`)
		process.exit(1)
	}

	const warn = str.match(/.*WARN(ING:)?\s*((.|\n)+)$/im)
	if(warn) {
		const warning = warn[2]
		warnings.push(warning)
	}
	
	const incompatible = str.match(/using Storybook .+ but you have packages which are incompatible/im)
	console.log({ str })
	if(incompatible) {
		// Extract all bullet points with package names
		const packageMatches = str.match(/- (.+)/gm)
		if(packageMatches) {
			for(const match of packageMatches) {
				const packageInfo = match.replace(/^- /, '')
				incompatibles.push(packageInfo)
			}
		}
	}


	const v = str.match(/storybook (v(\d+|\.)+)\s*$/im)
	if(v) {
		version = v[1]
		spinner.text = ` ${storybook} ${version} starting: ${text}`
	}

	const info = str.match(/\s*=>\s*(.+)\s*$/im)
	if(info) {
		text = info[1]
		spinner.text = ` ${storybook} ${version} starting: ${text}`
	}

	const started = str.match(/(\d+) ms for manager and (\d+) ms for preview/im)
	if(started) {
		const [_, msManager, msPreview] = started
		const [__, local] = str.match(/Local:\s+([^\s]*)\s*/im)!
		const [___, network] = str.match(/On your network:\s+([^\s]*)\s*/im)!

		const lines = [
			` ${'Storybook'.bold} ${version}`.green + ` (took ${`${parseFloat(msManager) + parseFloat(msPreview)} ms`.underline})`.gray,
			`Local     ` + `${local}`.cyan,
			`Network   ` + `${network}`.cyan
		]

		const longestLine = lines.reduce((a, b) => removeFormat(a).length > removeFormat(b).length ? a : b)
		spinner.succeed(lines.join('\n'))

		if(warnings.length > 0) {
			console.log('')
			spinner.warn(` Warnings:  ${warnings.length}`.yellow)
			for(const warning of warnings) {
				console.log(`-  ${warning}`.yellow)
			}
		}

		if(incompatibles.length > 0) {
			console.log('')
			spinner.warn(` Incompatible packages:  ${incompatibles.length}`.yellow)
			for(const incompatible of incompatibles) {
				console.log(`-  ${incompatible}`.yellow)
			}
		}

		console.log(`\n${''.padEnd(removeFormat(longestLine).length, '―').gray}\n`)
		break
	}
}



for await (const line of subprocess.stdout) {
	console.log(decoder.decode(line))
}