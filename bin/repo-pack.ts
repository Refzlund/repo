#!/usr/bin/env bun

import 'colors'
import { pack } from '../forward/pack'

// Legacy wrapper:
// - For simple packages: `bunx repo-pack`
// - For custom packaging: create your own script and call pack(options)

pack().catch((err) => {
	console.error(String(err))
	process.exitCode = 1
})