/*

const cli = new CLI()

cli.prefix
cli.suffix
cli.spacing


const subprocess = ...
cli.capture(subprocess, {
	...
})



⎻  Storybook v9.0.10 starting: ...
✔  Storybook v9.0.10 (took 666 ms)




- Spinner
- Spinner + Pick options/step-by-step
*/

import 'colors'
import { stdout } from 'node:process'
import readline from 'node:readline'

function startFresh() {
	// jump to the top-left of the visible window
	readline.cursorTo(stdout, 0, 2)
	// clear everything below; equivalent to ESC[2J
	readline.clearScreenDown(stdout)
}

class Line {

}

class CLISteps {}

class CLI {
	historicLines: string[] = []
	interactiveLines: string[] = []

	spinner(text: string): void
	spinner(options: {
		visual?: 'book'
		text: string 
	}): void
	spinner(textOrOptions: unknown) {}

	steps() { return new CLISteps() }
}


const cli = new CLI()
cli.spinner('Text')

console.log('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n')


startFresh()

console.log(`
${'╭──'.gray}  ${' Create App '.bgGreen.black}
${'│'.gray}
${'├─'.gray}${'○'.green}  Do you want to continue?
${'│'.gray}    ${'Yes'.gray}
${'│'.gray}
${'├─◎'.blue}  Are you sure?
${'└─🢖'.blue}  ${'🟆'.green} Yes ${'/'.gray.dim} ${'⯎ No'.gray}
`)

// ${'└─🢖'.blue}    ${'⯎ Yes'.gray} ${'/'.gray.dim} ${'🟆'.red} No



const frames = ['-', '\\', '|', '/']
let i = 0

const timer = setInterval(() => {
	// wipe current line & return cursor
	stdout.write('\x1b[2K\r')
	stdout.write(`loading ${frames[i++ % frames.length]}`)
}, 80)

setTimeout(() => {
	clearInterval(timer)
	stdout.write('\x1b[2K\r')		// clean last spinner frame
	stdout.write('done\n')
}, 3000)