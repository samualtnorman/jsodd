#!node_modules/.bin/rolldown -c
import { rolldownConfig } from "@samual/rolldown-config"

export default rolldownConfig(
	process.env.TEST_BUNDLE_AND_MINIFY
		? {
			rolldownOptions: { external: [] },
			terserOptions: { mangle: { keep_classnames: true, keep_fnames: true } },
			experimental: { disablePrettier: true }
		}
		: undefined
)
