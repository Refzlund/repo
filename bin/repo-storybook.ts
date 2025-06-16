import { fileURLToPath, spawn } from 'bun'
import ora from 'ora'
import 'colors'
import path from 'path'

const storybookConfigDir = path.join(fileURLToPath(import.meta.url), '../../.storybook')
const subprocess = spawn({
	cmd: [
		...`bun --bun storybook dev -p 6006 --no-open --disable-telemetry --config-dir`.split(' '),
		storybookConfigDir
	],
	stdout: 'pipe'
})

let version = '0.0.0'
let text = '...'

const storybook = 'Storybook'.yellow.bold as unknown as string

const spinner = ora({
	text: ` ${storybook} ${version} starting: ${text}`,
	color: 'magenta',
	spinner: {
		interval: 100,
		frames: [
			'⎺'.yellow,
			'⎻'.yellow,
			'⎼'.yellow,
			'⎽'.yellow,
			'⎼'.yellow,
			'⎽'.yellow,
			'⎽'.yellow,
			'⦟'.yellow,
			'∠'.yellow,
			'∟'.yellow,
			'⦦'.yellow,
			'⎽'.yellow,
			'⎽'.yellow,
			'⎽'.gray,
			'⎽'.gray.italic
		]
	}
}).start()

console.clear()
console.log('')

function removeFormat(str: string) {
	/* eslint-disable-next-line no-control-regex */
	return str.replaceAll(/\u001B\[[0-9;]*m/g, '')
}

const decoder = new TextDecoder()
const warnings = [] as string[]
for await (const line of subprocess.stdout) {
	const str = removeFormat(decoder.decode(line))
	
	const err = str.match(/Original error:\s*\n+((.|\n)+)$/im)
	if(err) {
		spinner.fail(` ${storybook} ${version} failed:`.red + `\n${err[1]}`)
		process.exit(1)
	}

	const warn = str.match(/WARN\s*(.+)$/im)
	if(warn) {
		const warning = warn[1]
		warnings.push(warning)
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

		console.log(`\n${''.padEnd(removeFormat(longestLine).length, '―').gray}\n`)
		break
	}
}



for await (const line of subprocess.stdout) {
	console.log(decoder.decode(line))
}