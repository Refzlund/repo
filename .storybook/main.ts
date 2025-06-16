import type { StorybookConfig } from '@storybook/svelte-vite'
import react from '@vitejs/plugin-react-swc'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'

const workingDir = process.cwd()
// * file:///c:/.../main.ts
const dir = path.join(fileURLToPath(import.meta.url), '..')
const relative = path.relative(dir, workingDir)

const mdx = path.join(relative, '**/*.mdx').replaceAll('\\', '/')
const stories = path.join(relative, '**/*.stories.@(js|jsx|mjs|ts|tsx|svelte)').replaceAll('\\', '/')

const config: StorybookConfig = {
	stories: [mdx, stories],
	addons: [
		'@storybook/addon-svelte-csf',
		'@storybook/addon-docs',
		'@storybook/addon-designs',
		'@storybook/addon-a11y',
		'@storybook/addon-links'
	],
	framework: '@storybook/svelte-vite',
	viteFinal: async config => {
		config.plugins?.splice(0, 0, svelte())
		config.plugins?.splice(1, 0, tailwindcss())
		config.root = workingDir

		config.plugins?.push(react({
			// Required for `.svelte.ts` files to work correctly
			devTarget: 'esnext'
		}))
		config.resolve?.extensions?.push('.tsx', '.jsx')
		return config
	}
}

export default config