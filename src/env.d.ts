type RawJSON = { rawJSON: string }

interface JSON {
	isRawJSON?: (value: unknown) => value is RawJSON
	rawJSON?: (value: null | boolean | number | string) => RawJSON
}
