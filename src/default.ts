import type { LaxPartial } from "@samual/types"
import { tryCatch } from "@samual/try"

const WellKnownSymbols = new Map([
	[ Symbol.isConcatSpreadable, `Symbol.isConcatSpreadable` ],
	[ Symbol.iterator, `Symbol.iterator` ],
	[ Symbol.match, `Symbol.match` ],
	[ Symbol.replace, `Symbol.replace` ],
	[ Symbol.search, `Symbol.search` ],
	[ Symbol.species, `Symbol.species` ],
	[ Symbol.hasInstance, `Symbol.hasInstance` ],
	[ Symbol.split, `Symbol.split` ],
	[ Symbol.toPrimitive, `Symbol.toPrimitive` ],
	[ Symbol.toStringTag, `Symbol.toStringTag` ],
	[ Symbol.unscopables, `Symbol.unscopables` ],
	[ Symbol.asyncIterator, `Symbol.asyncIterator` ],
	[ Symbol.matchAll, `Symbol.matchAll` ],
	[ Symbol.dispose, `Symbol.dispose` ],
	[ Symbol.asyncDispose, `Symbol.asyncDispose` ]
])

const isObject = (value: unknown): value is object =>
	(!!value && typeof value == `object`) || typeof value == `function`

/** `Object.isFrozen()` is bugged in V8, looks like it ignores the `.prototype` property or something. */
const isActuallyFrozen = (target: object) => !Reflect.isExtensible(target) && Reflect.ownKeys(target).every(key => {
	const { configurable, writable } = Reflect.getOwnPropertyDescriptor(target, key)!

	return !(configurable || writable)
})

const TypedArray = Reflect.getPrototypeOf(Uint8Array) as {
	prototype: { buffer: ArrayBufferLike, byteLength: number, byteOffset: number, length: number, [Symbol.toStringTag]: string }
}

const GeneratorFunction = (function* () {}).constructor
const GeneratorPrototype = GeneratorFunction.prototype.prototype
const AsyncFunction = (async () => {}).constructor
const AsyncGenerator = Reflect.getPrototypeOf((async function* () {}).prototype)!.constructor
const arrayIterator = [].values()
const ArrayIteratorPrototype = Reflect.getPrototypeOf(arrayIterator)!
const StringIteratorPrototype = Reflect.getPrototypeOf(``[Symbol.iterator]())!
const MapIteratorPrototype = Reflect.getPrototypeOf(new Map().values())!
const SetIteratorPrototype = Reflect.getPrototypeOf(new Set().values())!
const RegExpStringIteratorHelper = Reflect.getPrototypeOf(/a/[Symbol.matchAll](``))!
const segments = new Intl.Segmenter().segment(``)
const SegmentsPrototype = Reflect.getPrototypeOf(segments)!
const SegmentsIteratorPrototype = Reflect.getPrototypeOf(segments[Symbol.iterator]())!
const IteratorHelperPrototype = (arrayIterator.map && Reflect.getPrototypeOf(arrayIterator.map(_ => _))!) as object | undefined
const WrapForValidIteratorPrototype = typeof Iterator == `function` ? Reflect.getPrototypeOf(Iterator.from({} as any))! : undefined

const regExpSourceGetter = Reflect.getOwnPropertyDescriptor(RegExp.prototype, `source`).get!
const regExpFlagsGetter = Reflect.getOwnPropertyDescriptor(RegExp.prototype, `flags`).get!
const v8ErrorStackDescriptor = Reflect.getOwnPropertyDescriptor(Error(), `stack`) as PropertyDescriptor<string | undefined> | undefined
const errorStackGetter = v8ErrorStackDescriptor?.get || Reflect.getOwnPropertyDescriptor(Error.prototype, `stack`)?.get
const arrayBufferByteLengthGetter = Reflect.getOwnPropertyDescriptor(ArrayBuffer.prototype, `byteLength`).get!

const sharedArrayBufferByteLengthGetter = typeof SharedArrayBuffer == `function`
	? Reflect.getOwnPropertyDescriptor(SharedArrayBuffer.prototype, `byteLength`).get
	: undefined

const dataViewBufferGetter = Reflect.getOwnPropertyDescriptor(DataView.prototype, `buffer`).get!
const dataViewByteLengthGetter = Reflect.getOwnPropertyDescriptor(DataView.prototype, `byteLength`).get!
const dataViewByteOffsetGetter = Reflect.getOwnPropertyDescriptor(DataView.prototype, `byteOffset`).get!

const getRegexSource = (regex: unknown): string | undefined => tryCatch(() => `/${regExpSourceGetter.call(regex)}/${regExpFlagsGetter.call(regex)}`)
const getErrorStack = (error: unknown): string | undefined => tryCatch(() => errorStackGetter?.call(error))
const getArrayBufferByteLength = (value: unknown): number | undefined => tryCatch(() => arrayBufferByteLengthGetter.call(value))
const getSharedArrayBufferByteLength = (value: unknown) => tryCatch(() => sharedArrayBufferByteLengthGetter?.call(value) as number | undefined)

const typedArrayBufferGetter = Reflect.getOwnPropertyDescriptor(TypedArray.prototype, `buffer`).get!
const typedArrayByteLengthGetter = Reflect.getOwnPropertyDescriptor(TypedArray.prototype, "byteLength").get!
const typedArrayByteOffsetGetter = Reflect.getOwnPropertyDescriptor(TypedArray.prototype, "byteOffset").get!
const typedArrayLengthGetter = Reflect.getOwnPropertyDescriptor(TypedArray.prototype, "length").get!
const typedArrayTagGetter = Reflect.getOwnPropertyDescriptor(TypedArray.prototype, Symbol.toStringTag).get!

const getTypedArrayAttributes = (value: unknown):
	{ buffer: ArrayBufferLike, byteLength: number, byteOffset: number, length: number, tag: string } | undefined =>
	tryCatch(() => ({
		buffer: typedArrayBufferGetter.call(value),
		byteLength: typedArrayByteLengthGetter.call(value),
		byteOffset: typedArrayByteOffsetGetter.call(value),
		length: typedArrayLengthGetter.call(value),
		tag: typedArrayTagGetter.call(value)
	}))

const getDataViewAttributes = (value: unknown):
	{ buffer: ArrayBufferLike, byteLength: number, byteOffset: number } | undefined =>
	tryCatch(() => ({
		buffer: dataViewBufferGetter.call(value),
		byteLength: dataViewByteLengthGetter.call(value),
		byteOffset: dataViewByteOffsetGetter.call(value)
	}))

const domExceptionNameGetter = Reflect.getOwnPropertyDescriptor(DOMException.prototype, `name`).get!
const domExceptionMessageGetter = Reflect.getOwnPropertyDescriptor(DOMException.prototype, `message`).get!
const domExceptionCodeGetter = Reflect.getOwnPropertyDescriptor(DOMException.prototype, `code`).get

const getDOMExceptionAttributes = (value: unknown): { name: string, message: string, code: number | undefined } | undefined =>
	tryCatch(() => ({
		name: domExceptionNameGetter.call(value),
		message: domExceptionMessageGetter.call(value),
		code: domExceptionCodeGetter?.call(value)
	}))

const formatName = (name: string): string => /^[\w$]+$/.test(name) ? name : JSON.stringify(name)

const symbolToJsodd = (symbol: symbol, names: Map<unknown, string>, valueName: string): string => {
	const symbolKey = Symbol.keyFor(symbol)

	if (symbolKey != undefined)
		return `Symbol.for(${JSON.stringify(symbolKey)})`

	if (names.has(symbol))
		return names.get(symbol)!

	names.set(symbol, valueName || `.`)

	return `Symbol(${symbol.description == null ? `` : JSON.stringify(symbol.description)})`
}

export type FriendlyNames = { map: Map<object | symbol, string>, symbolReferenceCount: number }

export const cloneFriendlyNames = ({ map = new Map, symbolReferenceCount = 0 }: FriendlyNames) =>
	({ map: new Map(map), symbolReferenceCount })

export const mapFriendlyNames = (values: Record<string, object | symbol>): FriendlyNames => {
	const names = new Map<object | symbol, string>
	let symbolReferenceCount = 0

	const nameKey = (key: string | symbol): string => {
		if (typeof key == `string`)
			return key

		const symbolKey = Symbol.keyFor(key)

		if (symbolKey)
			return `[Symbol.for(${JSON.stringify(symbolKey)})]`

		if (names.has(key))
			return `[${names.get(key)}]`

		const name = `Symbol(${key.description == null ? `` : JSON.stringify(key.description)}) *${++symbolReferenceCount}`

		names.set(key, name)

		return `[${name}]`
	}

	const queue: { name: string, value: object }[] = Object.entries(values)
		.map(([ name, value ]) => {
			names.set(value, name)

			if (typeof value != `symbol`)
				return { name, value }
		})
		.filter(Boolean)

	while (queue.length) {
		const item = queue.shift()!

		for (const key of Reflect.ownKeys(item.value)) {
			const descriptor = Reflect.getOwnPropertyDescriptor(item.value, key)!
			const keyName = nameKey(key)

			if ("value" in descriptor) {
				if (
					(isObject(descriptor.value) || typeof descriptor.value == `function` || typeof descriptor.value == `symbol`) &&
					!names.has(descriptor.value)
				) {
					const valueName = `${item.name}${keyName[0] == `[` ? `` : `.`}${keyName}`

					names.set(descriptor.value, valueName)

					if (typeof descriptor.value != `symbol`)
						queue.push({ name: valueName, value: descriptor.value })
				}
			} else {
				if (descriptor.get && !names.has(descriptor.get)) {
					const valueName = `${item.name}.<get ${keyName}>`

					names.set(descriptor.get, valueName)
					queue.push({ name: valueName, value: descriptor.get })
				}

				if (descriptor.set && !names.has(descriptor.set)) {
					const valueName = `${item.name}.<set ${keyName}>`

					names.set(descriptor.set, valueName)
					queue.push({ name: valueName, value: descriptor.set })
				}
			}
		}

		const prototype = Reflect.getPrototypeOf(item.value)

		if (prototype && !names.has(prototype)) {
			const prototypeName = `${item.name}.<prototype>`

			names.set(prototype, prototypeName)
			queue.push({ name: prototypeName, value: prototype })
		}
	}

	return { map: names, symbolReferenceCount }
}

const functionNameOrLengthDescriptorIsProper = (function_: object, descriptor: PropertyDescriptor) =>
	!descriptor.enumerable && !descriptor.writable && descriptor.configurable != Object.isSealed(function_)

const functionNameDescriptorIsProper = (function_: object, descriptor?: PropertyDescriptor):
	descriptor is { configurable: boolean, enumerable: false, value: string, writable: false } =>
	!!(typeof descriptor?.value == `string` && functionNameOrLengthDescriptorIsProper(function_, descriptor))

const functionLengthDescriptorIsProper = (function_: object, descriptor?: PropertyDescriptor):
	descriptor is { configurable: boolean, enumerable: false, value: number, writable: false } =>
	!!(typeof descriptor?.value == `number` && functionNameOrLengthDescriptorIsProper(function_, descriptor))

declare const InternalError: object
declare const Temporal: object

const builtinFriendlyNames = mapFriendlyNames({
	// Standard built-in objects (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects)
		// Fundamental objects
		Function,
		Object,
		Boolean,
		Symbol,

		// Error objects
		Error,
		AggregateError,
		EvalError,
		RangeError,
		ReferenceError,
		...typeof SuppressedError != `undefined` ? { SuppressedError } : undefined,
		SyntaxError,
		TypeError,
		URIError,
		...typeof InternalError != `undefined` && { InternalError },

		// Numbers and dates
		Number,
		BigInt,
		Math,
		Date,
		...typeof Temporal != `undefined` && { Temporal },

		// Text processing
		String,
		RegExp,

		// Indexed collections
		Array,
		"<TypedArray>": TypedArray,
		Int8Array,
		Uint8Array,
		Uint8ClampedArray,
		Int16Array,
		Uint16Array,
		Int32Array,
		Uint32Array,
		BigInt64Array,
		BigUint64Array,
		...typeof Float16Array != `undefined` ? { Float16Array } : undefined,
		Float32Array,
		Float64Array,

		// Keyed collections
		Map,
		Set,
		WeakMap,
		WeakSet,

		// Structured data
		ArrayBuffer,
		...typeof SharedArrayBuffer != `undefined` ? { SharedArrayBuffer } : undefined,
		DataView,
		Atomics,
		JSON,

		// Managing memory
		WeakRef,
		FinalizationRegistry,

		// Function properties
		eval,
		isFinite,
		isNaN,
		parseFloat,
		parseInt,
		decodeURI,
		decodeURIComponent,
		encodeURI,
		encodeURIComponent,
		...typeof escape != `undefined` && { escape },
		...typeof unescape != `undefined` && { unescape },

		// Control abstraction objects
		...typeof Iterator != `undefined` ? { Iterator } : undefined,
		Promise,
		"<GeneratorFunction>": GeneratorFunction,
		"<AsyncGenerator>": AsyncGenerator,
		"<AsyncFunction>": AsyncFunction,
		...typeof AsyncDisposableStack != `undefined` ? { AsyncDisposableStack } : undefined,

		// Reflection
		Reflect,
		Proxy,

		// Internationalization
		Intl,

	// Document Object Model (DOM) (https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)
	DOMException,
	Event,
	EventTarget,

	// File API (https://developer.mozilla.org/en-US/docs/Web/API/File_API)
	Blob,
	File,
	...typeof FileList != `undefined` && { FileList },
	...typeof FileReader != `undefined` && { FileReader },
	...typeof FileReaderSync != `undefined` && { FileReaderSync },

	// Unsorted
	"<GeneratorPrototype>": GeneratorPrototype,
	"<ArrayIteratorPrototype>": ArrayIteratorPrototype,
	"<StringIteratorPrototype>": StringIteratorPrototype,
	"<MapIteratorPrototype>": MapIteratorPrototype,
	"<SetIteratorPrototype>": SetIteratorPrototype,
	...IteratorHelperPrototype && { "<IteratorHelperPrototype>": IteratorHelperPrototype },
	"<RegExpStringIteratorHelper>": RegExpStringIteratorHelper,
	"<SegmentsPrototype>": SegmentsPrototype,
	"<SegmentsIteratorPrototype>": SegmentsIteratorPrototype,
	...WrapForValidIteratorPrototype && { "<WrapForValidIteratorPrototype>": WrapForValidIteratorPrototype },

	...v8ErrorStackDescriptor?.get && { "<V8ErrorStackGetter>": v8ErrorStackDescriptor.get },
	...v8ErrorStackDescriptor?.set && { "<V8ErrorStackSetter>": v8ErrorStackDescriptor.set }
})

builtinFriendlyNames.map.set(globalThis, `globalThis`)

type ToJsoddOptions = LaxPartial<{
	indentLevel: number
	indentString: string
	friendlyNames: FriendlyNames
	valueName: string
}>

type StringToJsoddOptions = LaxPartial<{
	indentLevel: number
	indentString: string
}>

const id = <T>(value: T) => value

const MULTILINE_STRING_STYLE = id<`Zig` | `C`>(`C`)

const stringToJsodd = (string: string, { indentLevel = 0, indentString = `\t` }: StringToJsoddOptions = {}): string => {
	const indent = () => indentString.repeat(indentLevel)

	if (string.includes(`\n`)) {
		if (MULTILINE_STRING_STYLE == `Zig`)
			return `\n${indent()}\\\\${string.replaceAll(`\n`, `\n${indent()}\\\\`)}`
		else
			return `\n${indent()}${string.split(`\n`).map(line => JSON.stringify(line).slice(0, -1)).join(`\\n"\n${indent()}`)}"`
	}

	return JSON.stringify(string)
}

export const toJsodd = (value: unknown, {
	indentLevel = 0,
	indentString = `\t`,
	friendlyNames = cloneFriendlyNames(builtinFriendlyNames),
	valueName = ``
}: ToJsoddOptions = {}): string => {
	let o = ``

	stringify(value, valueName)

	return o

	function stringify(value: unknown, valueName: string, isTerseMethod?: boolean): void {
		if (typeof value == `bigint`)
			o += `${value}n`
		else if (typeof value == `string`)
			o += stringToJsodd(value, { indentLevel: indentLevel + 1, indentString })
		else if (typeof value == `symbol`)
			o += symbolToJsodd(value, friendlyNames.map, valueName)
		else if (JSON.isRawJSON?.(value)) {
			o += `RawJSON ${JSON.stringify(value.rawJSON)}`
		} else if (typeof value == `function` || isObject(value)) {
			if (friendlyNames.map.has(value))
				o += friendlyNames.map.get(value)!
			else {
				const indent = () => indentString.repeat(indentLevel)

				friendlyNames.map.set(value, valueName || `.`)

				if (isActuallyFrozen(value))
					o += `frozen `
				else if (Object.isSealed(value))
					o += `sealed `
				else if (!Reflect.isExtensible(value))
					o += `unextensible `

				const keys = new Set(Reflect.ownKeys(value))

				if (typeof value == `function`) {
					if (isTerseMethod)
						keys.delete(`name`)
					else {
						o += `function `

						const nameDescriptor = Reflect.getOwnPropertyDescriptor(value, `name`)

						if (functionNameDescriptorIsProper(value, nameDescriptor)) {
							o += formatName(nameDescriptor.value)
							keys.delete(`name`)
						}
					}

					const lengthDescriptor = Reflect.getOwnPropertyDescriptor(value, `length`)

					if (functionLengthDescriptorIsProper(value, lengthDescriptor)) {
						o += `(${lengthDescriptor.value}) `
						keys.delete(`length`)
					}
				}

				const regexSource = getRegexSource(value)

				if (regexSource != undefined)
					o += `${regexSource} `

				const mapEntries = tryCatch(() => Map.prototype.entries.call(value).map(([ key, value ], index): [ number, unknown, unknown ] => [ index, key, value ]).toArray())

				if (mapEntries)
					o += `Map `

				const stack = getErrorStack(value)

				if (stack != undefined)
					o += `Error `

				const setValues = tryCatch(() => Set.prototype.values.call(value).map((value, index) => [ index, value ]).toArray())

				if (setValues)
					o += `Set `

				// It is safe to call with `undefined`, it'll just always return `false`.

				const isWeakMap = tryCatch(() => !WeakMap.prototype.has.call(value, undefined as any), () => false)

				if (isWeakMap)
					o += `WeakMap `

				const isWeakSet = tryCatch(() => !WeakSet.prototype.has.call(value, undefined as any), () => false)

				if (isWeakSet)
					o += `WeakSet `

				const arrayBufferByteLength = getArrayBufferByteLength(value)

				if (arrayBufferByteLength != undefined)
					o += `ArrayBuffer `

				const sharedArrayBufferByteLength = getSharedArrayBufferByteLength(value)

				if (sharedArrayBufferByteLength != undefined)
					o += `SharedArrayBuffer `

				const typedArrayAttributes = getTypedArrayAttributes(value)

				if (typedArrayAttributes)
					o += `${typedArrayAttributes.tag} `

				const dataViewAttributes = getDataViewAttributes(value)

				if (dataViewAttributes)
					o += `DataView `

				const booleanObjectValue = tryCatch(() => Boolean.prototype.valueOf.call(value))

				if (booleanObjectValue != undefined)
					o += `Boolean `

				const numberObjectValue = tryCatch(() => Number.prototype.valueOf.call(value))

				if (numberObjectValue != undefined)
					o += `Number `

				const stringObjectValue = tryCatch(() => String.prototype.valueOf.call(value))

				if (stringObjectValue != undefined) {
					o += `String `

					keys.delete(`length`)

					for (let index = stringObjectValue.length; index--;)
						keys.delete(String(index))
				}

				const isWeakRef = tryCatch(() => !!WeakRef.prototype.deref.call(value), () => false)

				if (isWeakRef)
					o += `WeakRef `

				const isPromise = tryCatch(() => !!Promise.prototype.finally.call(value), () => false)

				if (isPromise)
					o += `Promise `

				const symbolObjectValue = tryCatch(() => Symbol.prototype.valueOf.call(value))

				if (symbolObjectValue)
					o += `Symbol `

				const domExceptionAttributes = getDOMExceptionAttributes(value)

				if (domExceptionAttributes)
					o += `DOMException `

				const isArray = Array.isArray(value) || typedArrayAttributes

				o += isArray ? `[` : `{`
				indentLevel++

				let prefix = ``

				const stringifyEntry = (name: string, value: string): void => {
					o += `\n${indent()}${prefix}${name}: ${value}`
				}

				if (booleanObjectValue != undefined)
					stringifyEntry(`<primitive>`, `${booleanObjectValue}`)

				if (stringObjectValue != undefined)
					stringifyEntry(`<primitive>`, JSON.stringify(stringObjectValue))

				if (numberObjectValue != undefined)
					stringifyEntry(`<primitive>`, JSON.stringify(numberObjectValue))

				if (symbolObjectValue)
					stringifyEntry(`<primitive>`, `${symbolToJsodd(symbolObjectValue, friendlyNames.map, `${valueName}.<primitive>`)}`)

				const stringifyProperties = (value: object, keys: Set<string | symbol>, isStatic: boolean): void => {
					for (const key of keys) {
						const descriptor = Reflect.getOwnPropertyDescriptor(value, key)!
						prefix = `\n${indent()}`

						if (isStatic)
							prefix += `static `

						if (!descriptor.configurable && !Object.isSealed(value))
							prefix += `unconfigurable `

						if (!descriptor.enumerable)
							prefix += `unenumerable `

						if (descriptor.writable == false && !isActuallyFrozen(value))
							prefix += `readonly `

						let keyString
						let keyName

						if (typeof key == `symbol`) {
							const symbolKey = Symbol.keyFor(key)

							if (symbolKey != undefined)
								keyString = keyName = `[Symbol.for(${JSON.stringify(symbolKey)})]`
							else if (friendlyNames.map.has(key))
								keyString = keyName = `[${friendlyNames.map.get(key)!}]`
							else {
								keyString = `[${symbolToJsodd(key, friendlyNames.map, `<symbol *${++friendlyNames.symbolReferenceCount}>`)} *${friendlyNames.symbolReferenceCount}]`
								keyName = `[<symbol *${friendlyNames.symbolReferenceCount}>]`
							}
						} else
							keyString = keyName = formatName(key)

						const expectedFunctionName =
							typeof key == `string` ? key : `[${WellKnownSymbols.get(key) || key.description}]`

						const stringifyKeyAndValue = (value: unknown, expectedFunctionName: string, name: string) => {
							let isTerseMethod = false

							if (typeof value == `function` && !friendlyNames.map.has(value)) {
								const nameDescriptor = Reflect.getOwnPropertyDescriptor(value, `name`)
								const lengthDescriptor = Reflect.getOwnPropertyDescriptor(value, `length`)

								isTerseMethod = functionNameDescriptorIsProper(value, nameDescriptor) && nameDescriptor.value == expectedFunctionName && functionLengthDescriptorIsProper(value, lengthDescriptor)
							}

							if (!isTerseMethod)
								o += `: `

							stringify(value, name, isTerseMethod)
						}

						if (`value` in descriptor) {
							o += `${prefix}${keyString}`
							stringifyKeyAndValue(descriptor.value, expectedFunctionName, `${valueName}${valueName && valueName != `.` && keyName[0] == `[` ? `` : `.`}${keyName}`)
						} else {
							if (descriptor.get) {
								o += `${prefix}get ${keyString}`
								stringifyKeyAndValue(descriptor.get, `get ${expectedFunctionName}`, `${valueName}.<get ${keyName}>`)
							}

							if (descriptor.set) {
								o += `${prefix}set ${keyString}`
								stringifyKeyAndValue(descriptor.set, `set ${expectedFunctionName}`, `${valueName}.<set ${keyName}>`)
							}
						}
					}
				}

				stringifyProperties(value, keys, false)

				if (mapEntries) {
					for (const [ index, key, value ] of mapEntries) {
						o += `\n${indent()}<entry ${index} key>: `
						stringify(key, `${valueName}.<entry ${index} key>`)
						o += `\n${indent()}<entry ${index} value>: `
						stringify(value, `${valueName}.<entry ${index} value>`)
					}
				}

				if (setValues) {
					for (const [ index, value ] of setValues) {
						o += `\n${indent()}<entry ${index}>: `
						stringify(value, `${valueName}.<entry ${index}>`)
					}
				}

				if (stack != undefined)
					o += `\n${indent()}<stack>: ${stringToJsodd(stack, { indentLevel: indentLevel + 1, indentString })}`

				if (arrayBufferByteLength != undefined) {
					o += `\n${indent()}<byteLength>: ${arrayBufferByteLength}\n${indent()}<content>: <${
						[ ...new Uint8Array(value as any) ].map(byte => byte.toString(16).toUpperCase().padStart(2, `0`)).join(` `)
					}>`
				}

				if (sharedArrayBufferByteLength != undefined) {
					o += `\n${indent()}<byteLength>: ${sharedArrayBufferByteLength}\n${indent()}<content>: <${
						[ ...new Uint8Array(value as any) ].map(byte => byte.toString(16).toUpperCase().padStart(2, `0`)).join(` `)
					}>`
				}

				if (typedArrayAttributes) {
					o += `\n${indent()}<buffer>: `
					stringify(typedArrayAttributes.buffer, `${valueName}.<buffer>`)
					o += `\n${indent()}<byteLength>: ${typedArrayAttributes.byteLength}\n${indent()}<byteOffset>: ${typedArrayAttributes.byteOffset}\n${indent()}<length>: ${typedArrayAttributes.length}`
				}

				if (dataViewAttributes) {
					o += `\n${indent()}<buffer>: `
					stringify(dataViewAttributes.buffer, `${valueName}.<buffer>`)
					o += `\n${indent()}<byteLength>: ${dataViewAttributes.byteLength}\n${indent()}<byteOffset>: ${dataViewAttributes.byteOffset}`
				}

				if (domExceptionAttributes) {
					const { name, message, code } = domExceptionAttributes

					o += `\n${indent()}<name>: ${JSON.stringify(name)}\n${indent()}<message>: ${JSON.stringify(message)}`

					if (code != undefined)
						o += `\n${indent()}<code>: ${JSON.stringify(code)}`
				}

				const prototype = Reflect.getPrototypeOf(value)

				const expectedPrototype =
					mapEntries ?
						Map.prototype
					: typeof value == `function` ?
						Function.prototype
					: Array.isArray(value) ?
						Array.prototype
					: stack != undefined ?
						Error.prototype
					: setValues ?
						Set.prototype
					: isWeakMap ?
						WeakMap.prototype
					: isWeakSet ?
						WeakSet.prototype
					: arrayBufferByteLength ?
						ArrayBuffer.prototype
					: sharedArrayBufferByteLength ?
						SharedArrayBuffer.prototype
					: typedArrayAttributes ?
						{
							Int8Array: Int8Array.prototype,
							Uint8Array: Uint8Array.prototype,
							Uint8ClampedArray: Uint8ClampedArray.prototype,
							Int16Array: Int16Array.prototype,
							Uint16Array: Uint16Array.prototype,
							Int32Array: Int32Array.prototype,
							Uint32Array: Uint32Array.prototype,
							BigInt64Array: BigInt64Array.prototype,
							BigUint64Array: BigUint64Array.prototype,
							Float16Array: Float16Array.prototype,
							Float32Array: Float32Array.prototype,
							Float64Array: Float64Array.prototype,
						}[typedArrayAttributes.tag]
					: booleanObjectValue != undefined ?
						Boolean.prototype
					: numberObjectValue != undefined ?
						Number.prototype
					: stringObjectValue != undefined ?
						String.prototype
					: dataViewAttributes ?
						DataView.prototype
					: isWeakRef ?
						WeakRef.prototype
					: isPromise ?
						Promise.prototype
					: symbolObjectValue ?
						Symbol.prototype
					: domExceptionAttributes ?
						DOMException.prototype
					: Object.prototype

				if (prototype != expectedPrototype) {
					o += `\n${indent()}<prototype>: `
					stringify(prototype, `${valueName}.<prototype>`)
				}

				indentLevel--

				if (
					keys.size || mapEntries?.length || prototype != expectedPrototype || stack != undefined ||
					setValues?.length || arrayBufferByteLength != undefined ||
					sharedArrayBufferByteLength != undefined || typedArrayAttributes ||
					booleanObjectValue != undefined || numberObjectValue != undefined ||
					stringObjectValue != undefined || dataViewAttributes || symbolObjectValue || domExceptionAttributes
				)
					o += `\n${indent()}`

				o += isArray ? `]` : `}`
			}
		} else
			o += String(value)
	}
}

if (import.meta.vitest) {
	const { test, expect } = import.meta.vitest

	test(`undefined`, () => {
		expect(toJsodd(undefined)).toBe(`undefined`)
	})

	test(`null`, () => {
		expect(toJsodd(null)).toBe(`null`)
	})

	test(`boolean`, () => {
		expect(toJsodd(true)).toBe(`true`)
		expect(toJsodd(false)).toBe(`false`)
	})

	test(`number`, () => {
		expect(toJsodd(1)).toBe(`1`)
	})

	test(`bigint`, () => {
		expect(toJsodd(1n)).toBe(`1n`)
	})

	test(`string`, () => {
		expect(toJsodd(`foo`)).toBe(`"foo"`)
	})

	test(`symbol`, () => {
		expect(toJsodd(Symbol())).toBe(`Symbol()`)
		expect(toJsodd(Symbol(`foo`))).toBe(`Symbol("foo")`)
	})

	test(`symbol registry`, () => {
		expect(toJsodd(Symbol.for(`foo`))).toBe(`Symbol.for("foo")`)
	})

	test(`well-known symbol`, () => {
		expect(toJsodd(Symbol.iterator)).toBe(`Symbol.iterator`)
	})

	test(`object`, () => {
		expect(toJsodd({ foo: `bar` })).toMatchInlineSnapshot(`
			"{
				foo: "bar"
			}"
		`)
	})

	test(`generator object`, () => {
		expect(toJsodd((function* () {})())).toMatchInlineSnapshot(`
			"{
				<prototype>: {
					<prototype>: <GeneratorPrototype>
				}
			}"
		`)
	})

	test(`symbol key`, () => {
		expect(toJsodd({ [Symbol.toStringTag]: `Foo` })).toMatchInlineSnapshot(`
			"{
				[Symbol.toStringTag]: "Foo"
			}"
		`)
	})

	test(`symbol as key and value`, () => {
		const symbol = Symbol(`foo`)

		expect(toJsodd({ [symbol]: symbol })).toMatchInlineSnapshot(`
			"{
				[Symbol("foo") *7]: <symbol *7>
			}"
		`)
	})

	test(`symbol used as key twice`, () => {
		const symbol = Symbol(`foo`)

		expect(toJsodd({ a: { [symbol]: symbol }, b: { [symbol]: symbol } })).toMatchInlineSnapshot(`
			"{
				a: {
					[Symbol("foo") *7]: <symbol *7>
				}
				b: {
					[<symbol *7>]: <symbol *7>
				}
			}"
		`)
	})

	test(`symbol getter`, () => {
		expect(toJsodd({
			get [Symbol.toStringTag]() {
				return `Foo`
			}
		})).toMatchInlineSnapshot(`
			"{
				get [Symbol.toStringTag](0) {}
			}"
		`)
	})

	test(`unextensible`, () => {
		expect(toJsodd(Object.preventExtensions({
			foo: `bar`
		}))).toMatchInlineSnapshot(`
			"unextensible {
				foo: "bar"
			}"
		`)
	})

	test(`sealed`, () => {
		expect(toJsodd(Object.seal({
			foo: `bar`
		}))).toMatchInlineSnapshot(`
			"sealed {
				foo: "bar"
			}"
		`)
	})

	test(`frozen`, () => {
		expect(toJsodd(Object.freeze({
			foo: `bar`
		}))).toMatchInlineSnapshot(`
			"frozen {
				foo: "bar"
			}"
		`)
	})

	test(`only readonly`, () => {
		expect(toJsodd(Object.defineProperties({}, {
			foo: {
				writable: false,
				configurable: true,
				enumerable: true,
				value: `bar`
			}
		}))).toMatchInlineSnapshot(`
			"{
				readonly foo: "bar"
			}"
		`)
	})

	test(`empty object`, () => {
		expect(toJsodd({})).toMatchInlineSnapshot(`"{}"`)
	})

	test(`arrow function`, () => {
		expect(toJsodd(() => {})).toMatchInlineSnapshot(`"function ""(0) {}"`)
	})

	test(`function expression`, () => {
		expect(toJsodd(function () {})).toMatchInlineSnapshot(`
			"function ""(0) {
				unconfigurable unenumerable prototype: {
					unenumerable constructor: .
				}
			}"
		`)
	})

	test(`generator function`, () => {
		expect(toJsodd(function* () {})).toMatchInlineSnapshot(`
			"function ""(0) {
				unconfigurable unenumerable prototype: {
					<prototype>: <GeneratorPrototype>
				}
				<prototype>: <GeneratorFunction>.prototype
			}"
		`)
	})

	test(`generator function and object`, () => {
		function* generatorFunction() {}

		expect(toJsodd({ generatorFunction, generatorObject: generatorFunction() })).toMatchInlineSnapshot(`
			"{
				generatorFunction(0) {
					unconfigurable unenumerable prototype: {
						<prototype>: <GeneratorPrototype>
					}
					<prototype>: <GeneratorFunction>.prototype
				}
				generatorObject: {
					<prototype>: .generatorFunction.prototype
				}
			}"
		`)
	})

	test(`regex`, () => {
		expect(toJsodd(/ab+c/g)).toMatchInlineSnapshot(`
			"/ab+c/g {
				unconfigurable unenumerable lastIndex: 0
				<prototype>: RegExp.prototype
			}"
		`)
	})

	test(`fake regex`, () => {
		expect(toJsodd(Object.create(RegExp.prototype, {
			lastIndex: { value: 0, writable: true }
		}))).toMatchInlineSnapshot(`
			"{
				unconfigurable unenumerable lastIndex: 0
				<prototype>: RegExp.prototype
			}"
		`)
	})

	test(`map`, () => {
		expect(toJsodd(new Map([ [ "foo", "bar" ] ]))).toMatchInlineSnapshot(`
			"Map {
				<entry 0 key>: "foo"
				<entry 0 value>: "bar"
			}"
		`)
	})

	test(`prototypeless map`, () => {
		expect(toJsodd(Object.setPrototypeOf(new Map([ [ "foo", "bar" ] ]), null))).toMatchInlineSnapshot(`
			"Map {
				<entry 0 key>: "foo"
				<entry 0 value>: "bar"
				<prototype>: null
			}"
		`)
	})

	test(`set`, () => {
		expect(toJsodd(new Set([ `foo`, `bar`, `baz` ]))).toMatchInlineSnapshot(`
			"Set {
				<entry 0>: "foo"
				<entry 1>: "bar"
				<entry 2>: "baz"
			}"
		`)
	})

	test(`array buffer`, () => {
		expect(toJsodd(new Uint8Array([ 1, 2, 3 ]).buffer)).toMatchInlineSnapshot(`
			"ArrayBuffer {
				<byteLength>: 3
				<content>: <01 02 03>
			}"
		`)
	})

	test(`byte array`, () => {
		expect(toJsodd(new Uint8Array([ 1, 2, 3 ]))).toMatchInlineSnapshot(`
			"Uint8Array [
				0: 1
				1: 2
				2: 3
				<buffer>: ArrayBuffer {
					<byteLength>: 3
					<content>: <01 02 03>
				}
				<byteLength>: 3
				<byteOffset>: 0
				<length>: 3
			]"
		`)
	})

	test(`registry symbol as key`, () => {
		expect(toJsodd({ [Symbol.for(`foo`)]: 0 })).toMatchInlineSnapshot(`
			"{
				[Symbol.for("foo")]: 0
			}"
		`)
	})

	test(`symbol key to symbol key to symbol key`, () => {
		const a = Symbol(`a`)
		const b = Symbol(`b`)
		const c = Symbol(`c`)

		expect(toJsodd({
			[a]: b,
			[b]: c,
			[c]: a
		})).toMatchInlineSnapshot(`
			"{
				[Symbol("a") *7]: Symbol("b")
				[.[<symbol *7>]]: Symbol("c")
				[.[.[<symbol *7>]]]: <symbol *7>
			}"
		`)
	})

	test(`nested symbol key to symbol key to symbol key`, () => {
		const a = Symbol(`a`)
		const b = Symbol(`b`)
		const c = Symbol(`c`)

		expect(toJsodd({
			foo: {
				[a]: b,
				[b]: c,
				[c]: a
			}
		})).toMatchInlineSnapshot(`
			"{
				foo: {
					[Symbol("a") *7]: Symbol("b")
					[.foo[<symbol *7>]]: Symbol("c")
					[.foo[.foo[<symbol *7>]]]: <symbol *7>
				}
			}"
		`)
	})

	test(`object nested in symbol keys`, () => {
		const foo = {}

		expect(toJsodd({
			[Symbol.for(`foo`)]: { [Symbol.for(`bar`)]: foo },
			[Symbol.for(`bar`)]: foo
		})).toMatchInlineSnapshot(`
			"{
				[Symbol.for("foo")]: {
					[Symbol.for("bar")]: {}
				}
				[Symbol.for("bar")]: .[Symbol.for("foo")][Symbol.for("bar")]
			}"
		`)
	})

	test(`array`, () => {
		expect(toJsodd([ 1, 2, 3 ])).toMatchInlineSnapshot(`
			"[
				0: 1
				1: 2
				2: 3
				unconfigurable unenumerable length: 3
			]"
		`)
	})

	test(`function with overriden name and length`, () => {
		expect(toJsodd(Object.defineProperties(() => {}, {
			name: { get: () => {} },
			length: { get: () => {} }
		}))).toMatchInlineSnapshot(`
			"function {
				unenumerable get length: function get(0) {}
				unenumerable get name: function get(0) {}
			}"
		`)
	})

	test(`sealed function`, () => {
		expect(toJsodd(Object.seal(function foo() {}))).toMatchInlineSnapshot(`
			"sealed function foo(0) {
				unenumerable prototype: {
					unenumerable constructor: .
				}
			}"
		`)
	})

	test(`frozen function`, () => {
		expect(toJsodd(Object.freeze(function foo() {}))).toMatchInlineSnapshot(`
			"frozen function foo(0) {
				unenumerable prototype: {
					unenumerable constructor: .
				}
			}"
		`)
	})

	test(`referencing builtin symbol key getter`, () => {
		expect(toJsodd(Reflect.getOwnPropertyDescriptor(TypedArray.prototype, Symbol.toStringTag))).toMatchInlineSnapshot(`
			"{
				get: <TypedArray>.prototype.<get [Symbol.toStringTag]>
				set: undefined
				enumerable: false
				configurable: true
			}"
		`)
	})

	test(`no clashing symbol numbers`, () => {
		const s = Symbol(`foo`)

		expect(toJsodd(
			{
				[Symbol("bar")]: s
			},
			{
				friendlyNames: mapFriendlyNames({
					foo: Object.assign(Object.create(null), ({
						[s]: 1
					}))
				})
			}
		)).toMatchInlineSnapshot(`
			"{
				[Symbol("bar") *2]: Symbol("foo") *1
			}"
		`)
	})

	test(`terse method`, () => {
		expect(toJsodd({
			foo() {}
		})).toMatchInlineSnapshot(`
			"{
				foo(0) {}
			}"
		`)
	})

	test(`terse getter`, () => {
		expect(toJsodd({
			get foo() {
				return 1
			}
		})).toMatchInlineSnapshot(`
			"{
				get foo(0) {}
			}"
		`)
	})

	test(`boolean objects`, () => {
		expect(toJsodd(new Boolean(false))).toMatchInlineSnapshot(`
			"Boolean {
				<primitive>: false
			}"
		`)

		expect(toJsodd(new Boolean(true))).toMatchInlineSnapshot(`
			"Boolean {
				<primitive>: true
			}"
		`)
	})

	test(`extended boolean object`, () => {
		expect(toJsodd(Object.assign(new Boolean(true), { foo: `bar` }))).toMatchInlineSnapshot(`
			"Boolean {
				<primitive>: true
				foo: "bar"
			}"
		`)
	})

	test(`number object`, () => {
		expect(toJsodd(new Number(123))).toMatchInlineSnapshot(`
			"Number {
				<primitive>: 123
			}"
		`)
	})

	test(`string object`, () => {
		expect(toJsodd(new String(`foo`))).toMatchInlineSnapshot(`
			"String {
				<primitive>: "foo"
			}"
		`)
	})

	test(`extended string object`, () => {
		expect(toJsodd(Object.defineProperty(new String(`fo`), `2`, { value: `o`, enumerable: true }))).toMatchInlineSnapshot(`
			"String {
				<primitive>: "fo"
				unconfigurable readonly 2: "o"
			}"
		`)
	})

	test(`class`, () => {
		expect(toJsodd(class Foo {
			bar() {}
			get baz() { return 1 }
			set baz(_) {}
			static bar() {}
			static get baz() { return 1 }
			static set baz(_) {}
		})).toMatchInlineSnapshot(`
			"function Foo(0) {
				unconfigurable unenumerable readonly prototype: {
					unenumerable constructor: .
					unenumerable bar(0) {}
					unenumerable get baz(0) {}
					unenumerable set baz(1) {}
				}
				unenumerable bar(0) {}
				unenumerable get baz(0) {}
				unenumerable set baz(1) {}
			}"
		`)
	})

	test(`weak set`, () => {
		expect(toJsodd(new WeakSet([ {}, {}, {} ]))).toMatchInlineSnapshot(`"WeakSet {}"`)
	})

	test(`weak map`, () => {
		expect(toJsodd(new WeakMap([ [ {}, 1 ], [ {}, 2 ], [ {}, 3 ] ]))).toMatchInlineSnapshot(`"WeakMap {}"`)
	})

	test(`shared array buffer`, () => {
		const bytes = new Uint8Array(new SharedArrayBuffer(3))

		bytes.set([ 1, 2, 3 ])

		expect(toJsodd(bytes.buffer)).toMatchInlineSnapshot(`
			"SharedArrayBuffer {
				<byteLength>: 3
				<content>: <01 02 03>
			}"
		`)
	})

	test(`data view`, () => {
		expect(toJsodd(new DataView(new Uint8Array([ 1, 2, 3 ]).buffer))).toMatchInlineSnapshot(`
			"DataView {
				<buffer>: ArrayBuffer {
					<byteLength>: 3
					<content>: <01 02 03>
				}
				<byteLength>: 3
				<byteOffset>: 0
			}"
		`)
	})

	test(`weak ref`, () => {
		expect(toJsodd(new WeakRef({}))).toMatchInlineSnapshot(`
			"WeakRef {}"
		`)
	})

	if (JSON.rawJSON) {
		test(`raw json`, () => {
			expect(toJsodd(JSON.rawJSON!("10000000000000001"))).toMatchInlineSnapshot(`
				"RawJSON "10000000000000001""
			`)
		})
	}

	test(`symbol object`, () => {
		expect(toJsodd(Object(Symbol("foo")))).toMatchInlineSnapshot(`
			"Symbol {
				<primitive>: Symbol("foo")
			}"
		`)
	})

	test(`multiline string`, () => {
		expect(toJsodd({ foo: `bar\nbaz\nqux` })).toMatchInlineSnapshot(`
			"{
				foo: 
					"bar\\n"
					"baz\\n"
					"qux"
			}"
		`)
	})
}
