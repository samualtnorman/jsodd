import { readdir as readFolder } from "fs/promises"
import Path from "path"

/**
 * @arg {import("fs").Dirent} dirent
 * @return {string}
 */
const getDirentParentPath = dirent => /** @type {any} */ (dirent).parentPath ?? dirent.path

export const getExports = async (
	/** @type {string} */ queryFileExtension,
	/** @type {string | undefined} */ outputFileExtension = queryFileExtension
) => /** @type {Record<string, string>} */ ({
	".": `./default${outputFileExtension}`,
	...Object.fromEntries(
		(await readFolder(`dist`, { withFileTypes: true, recursive: true }))
			.filter(dirent => dirent.isFile())
			.map(dirent => Path.join(getDirentParentPath(dirent), dirent.name))
			.filter(path => path != `dist/default${queryFileExtension}` && path != `dist/internal${queryFileExtension}` && path.endsWith(queryFileExtension))
			.sort()
			.map(path => {
				const sliced = `.${path.slice(4, -queryFileExtension.length)}`

				return [ sliced, sliced + outputFileExtension ]
			})
	)
})
