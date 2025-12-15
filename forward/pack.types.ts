/**
 * Re-export types from the modular pack implementation.
 * This file exists for backwards compatibility.
 */
export type {
	CopyEntry,
	CliTransform,
	CliBundleConfig,
	PackHooks,
	PackOptions,
	OutputPackageJson,
	SourcePackageJson,
	PackPaths
} from './pack/types'

export { definePackOptions } from './pack/types'
