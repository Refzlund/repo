import { fileURLToPath, spawn } from 'bun'
import { existsSync } from 'fs'
import { join } from 'path'

const args = process.argv.slice(2)
if(args.length === 0) args.push('.')

const filePath = join(fileURLToPath(import.meta.url), '..')
const cwd = process.cwd()

const paths = [
	join(cwd, './eslint.config.ts'),
	join(cwd, './eslint.config.js'),
	join(filePath, '../eslint.config.ts')
]

const config = 
	existsSync(paths[0]) 
	? paths[0] 
	: existsSync(paths[1]) 
	? paths[1] 
	: paths[2]

spawn({
	cmd: [
		'bun',
		'--bun',
		'eslint',
		'--config',
		config,
		'--rule',
		'unused-imports/no-unused-imports: [warn]',
		'--fix',
		...args
	],
	stderr: 'inherit',
	stdout: 'inherit',
	stdin: 'inherit'
})