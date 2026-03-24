type RawJSON = { rawJSON: string }

interface JSON {
	isRawJSON?: (value: unknown) => value is RawJSON
	rawJSON?: (value: null | boolean | number | string) => RawJSON
}

declare const FileReaderSync: object | undefined
declare const AudioTrack: object | undefined
declare const AudioTrackList: object | undefined
declare const VideoTrack: object | undefined
declare const VideoTrackList: object | undefined
declare const DedicatedWorkerGlobalScope: object | undefined
declare const SharedWorkerGlobalScope: object | undefined
declare const WorkerGlobalScope: object | undefined
declare const WorkerLocation: object | undefined
declare const WorkerNavigator: object | undefined
