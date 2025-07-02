import eslint from './config/eslint/eslint-config'

const config = eslint({
	metaURL: import.meta.url
})

export default config