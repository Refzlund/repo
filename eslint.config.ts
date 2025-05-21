import { eslint } from './config/eslint/eslint-config'

const config = eslint(import.meta.url)

export default config