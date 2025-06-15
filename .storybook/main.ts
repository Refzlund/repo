import type { StorybookConfig } from '@storybook/svelte-vite'
import react from '@vitejs/plugin-react-swc'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const config: StorybookConfig = {
	stories: ['../**/*.mdx', '../**/*.stories.@(js|jsx|ts|tsx|svelte)'],
	addons: [
		'@storybook/addon-svelte-csf',
		'@storybook/addon-docs',
		'@storybook/addon-designs',
		'@storybook/addon-a11y',
		'@storybook/addon-links'
	],
	framework: '@storybook/svelte-vite',
	viteFinal: async config => {
		const { default: tailwindcss } = await import('@tailwindcss/vite')

		config.plugins?.splice(0, 0, svelte())
		if(tailwindcss) {
			config.plugins?.splice(1, 0, tailwindcss())
		}
		config.plugins?.push(react({
			// Required for `.svelte.ts` files to work correctly
			devTarget: 'esnext'
		}))
		config.resolve?.extensions?.push('.tsx', '.jsx')
		return config
	}
}

export default config