import "vitest"

declare global {
	type RawJSON = { rawJSON: string }

	interface JSON {
		isRawJSON?: (value: unknown) => value is RawJSON
		rawJSON?: (value: null | boolean | number | string) => RawJSON
	}

	const FileReaderSync: object | undefined
	const AudioTrack: object | undefined
	const AudioTrackList: object | undefined
	const VideoTrack: object | undefined
	const VideoTrackList: object | undefined
	const DedicatedWorkerGlobalScope: object | undefined
	const SharedWorkerGlobalScope: object | undefined
	const WorkerGlobalScope: object | undefined
	const WorkerLocation: object | undefined
	const WorkerNavigator: object | undefined
}

declare module 'vitest' {
	interface Assertion<T = any> {
		toMatchPattern(
			template: TemplateStringsArray,
			...substitutions: (number | RegExp | ((matches: string[]) => string))[]
		): T
	}
}
