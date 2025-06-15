import { spawn } from 'bun'
import ora from 'ora'
import 'colors'

const repoRoot = new URL('..', import.meta.url)
const storybookConfigDir = new URL('./.storybook', repoRoot)

const process = spawn({
	cmd: [
		...`bun --bun storybook dev -p 6006 --no-open --disable-telemetry --config-dir ${storybookConfigDir.pathname.substring(1)}`.split(' '),
		storybookConfigDir.pathname.substring(1)
	],
	stdout: 'pipe'
})

let version = '0.0.0'
let text = '...'
const spinner = ora(`Storybook ${version} starting: ${text}`).start()

console.clear()
console.log('')

function removeFormat(str: string) {
	/* eslint-disable-next-line no-control-regex */
	return str.replaceAll(/\u001B\[[0-9;]*m/g, '')
}

const decoder = new TextDecoder()
for await (const line of process.stdout) {
	const str = removeFormat(decoder.decode(line))

	const v = str.match(/storybook (v(\d+|\.)+)\s*$/im)
	if(v) {
		version = v[1]
		spinner.text = `Storybook ${version} starting: ${text}`
	}

	const info = str.match(/\s*=>\s*(.+)\s*$/im)
	if(info) {
		text = info[1]
		spinner.text = `Storybook ${version} starting: ${text}`
	}

	const started = str.match(/(\d+) ms for manager and (\d+) ms for preview/im)
	if(started) {
		const [_, msManager, msPreview] = started
		const [__, local] = str.match(/Local:\s+([^\s]*)\s*/im)!
		const [___, network] = str.match(/On your network:\s+([^\s]*)\s*/im)!

		const lines = [
			`Storybook ${version}`.green + ` (took ${`${parseFloat(msManager) + parseFloat(msPreview)} ms`.underline})`.gray,
			`Local     ` + `${local}`.cyan,
			`Network   ` + `${network}`.cyan
		]

		const longestLine = lines.reduce((a, b) => removeFormat(a).length > removeFormat(b).length ? a : b)
		lines.push('')
		lines.push(''.padEnd(removeFormat(longestLine).length, '―').gray)
		lines.push('')

		spinner.succeed(lines.join('\n'))
		break
	}
}



for await (const line of process.stdout) {
	console.log(decoder.decode(line))
}