/**
 * @deprecated
 * `repo-pack` no longer supports config-file loading.
 *
 * This file is kept as a tiny compatibility shim for older imports.
 * Prefer importing from `@refzlund/repo/pack`.
 */

export type {
	CopyEntry,
	CliTransform,
	CliBundleConfig,
	PackHooks,
	PackOptions
} from '../forward/pack/types'

/**
 * @deprecated Use `PackOptions` instead.
 */
export type PackConfig = import('../forward/pack/types').PackOptions

/**
 * @deprecated Use `definePackOptions` instead.
 */
export const definePackConfig = (config: PackConfig): PackConfig => config

export { definePackOptions } from '../forward/pack/types'
