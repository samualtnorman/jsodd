import { tryCatch } from "@samual/try"
import type { AnyFunction, LaxPartial } from "@samual/types"

const getDescriptor = Reflect.getOwnPropertyDescriptor
const isExtensible = Reflect.isExtensible
const getKeys = Reflect.ownKeys
const getSymbols = Object.getOwnPropertySymbols

const isFunction = (value: unknown): value is AnyFunction => typeof value == `function`
const isObject = (value: unknown): value is object => typeof value == `object` ? !!value : isFunction(value)
const isSymbol = (value: unknown): value is symbol => typeof value == `symbol`

/** `Object.isFrozen()` is bugged in V8, looks like it ignores the `.prototype` property or something. */
const isActuallyFrozen = (target: object) => !isExtensible(target) && getKeys(target).every(key => {
	const { configurable, writable } = getDescriptor(target, key)!

	return !(configurable || writable)
})

const getPrototype = Reflect.getPrototypeOf

const normaliseGetter = <T>(getter: () => T) => (value: any) => getter.call(value)

const getGetter = <T extends object, TKey extends keyof T | (string & {}) | symbol>(target: T, key: TKey) => {
	const getter = getDescriptor(target, key as any)?.get

	if (getter)
		return normaliseGetter(getter) as TKey extends keyof T ? ((v: any) => T[TKey]) | undefined : ((v: any) => unknown) | undefined
}

const getSymbol = (symbols: symbol[], description: string) => symbols.find(symbol => symbol.description == description)

const TypedArray = getPrototype(Uint8Array) as {
	prototype: { buffer: ArrayBufferLike, byteLength: number, byteOffset: number, length: number, [Symbol.toStringTag]: string }
}

const GeneratorFunction = (function* () {}).constructor
const arrayIterator = [].values()
const segments = new Intl.Segmenter().segment(``)

const RegExpGetSource = getGetter(RegExp.prototype, `source`)
const RegExpGetFlags = getGetter(RegExp.prototype, `flags`)
const v8ErrorStackDescriptor = getDescriptor(Error(), `stack`) as PropertyDescriptor<string | undefined> | undefined
const ErrorGetStack = v8ErrorStackDescriptor?.get ? normaliseGetter(v8ErrorStackDescriptor.get) : getGetter(Error.prototype, `stack`)
const ArrayBufferGetByteLength = getGetter(ArrayBuffer.prototype, `byteLength`)

const SharedArrayBufferGetByteLength = typeof SharedArrayBuffer == `function`
	? getGetter(SharedArrayBuffer.prototype, `byteLength`)
	: undefined

const getRegexSource = (regex: unknown): string | undefined => RegExpGetSource && RegExpGetFlags && tryCatch(() => `/${RegExpGetSource(regex)}/${RegExpGetFlags(regex)}`)
const getErrorStack = (error: unknown): string | undefined => tryCatch(() => ErrorGetStack?.(error))
const getArrayBufferByteLength = (value: unknown): number | undefined => ArrayBufferGetByteLength && tryCatch(() => ArrayBufferGetByteLength(value))
const getSharedArrayBufferByteLength = (value: unknown) => tryCatch(() => SharedArrayBufferGetByteLength?.(value) as number | undefined)

const TypedArrayPrototype = TypedArray.prototype
const TypedArrayGetTag = getGetter(TypedArrayPrototype, Symbol.toStringTag)

const emptyBlob: any = new Blob
const nodeBlobSymbolKeys = getSymbols(emptyBlob)
const NodeJsBlobHandleSymbol = getSymbol(nodeBlobSymbolKeys, `kHandle`)
const emptyFile: any = new File([], ``)
const NodeJsFileStateSymbol = getSymbol(getSymbols(emptyFile), `state`)
const DOMExceptionPrototype = DOMException.prototype
const domExceptionPrototypeSymbolKeys = getSymbols(DOMExceptionPrototype)
const eventTargetPrototypeSymbolKeys = getSymbols(EventTarget.prototype)
const abortSignalSymbolKeys = getSymbols(AbortSignal.prototype)
const eventTarget = new EventTarget
const eventTargetInstanceSymbolKeys = getSymbols(eventTarget)
const NodeJsEventTargetEventsSymbol = getSymbol(eventTargetInstanceSymbolKeys, `kEvents`)
const eventInstanceSymbolKeys = getSymbols(new Event(``))

const makeAttributeGetter = (
	getters: Record<string, ((v: any) => any) | undefined>
): (value: any) => [ string, any ][] => {
	const entries = Object.entries(getters).filter((entry): entry is [ string, (v: any) => any ] => !!entry[1])

	return (value: any) =>
		entries.flatMap(([ name, getter ]) => tryCatch((): [ string, any ][] => [ [ name, getter(value) ] ], () => []))
}

const getBlobAttributes =
	makeAttributeGetter({ size: getGetter(Blob.prototype, `size`), type: getGetter(Blob.prototype, `type`) })

const getFileAttributes = makeAttributeGetter({
	lastModified: getGetter(File.prototype, `lastModified`),
	name: getGetter(File.prototype, `name`),
	webkitRelativePath: getGetter(File.prototype, `webkitRelativePath`)
})

const getTypedArrayAttributes = makeAttributeGetter({
	buffer: getGetter(TypedArrayPrototype, `buffer`),
	byteLength: getGetter(TypedArrayPrototype, "byteLength"),
	byteOffset: getGetter(TypedArrayPrototype, "byteOffset"),
	length: getGetter(TypedArrayPrototype, "length"),
})

const DataViewPrototype = DataView.prototype

const getDataViewAttributes = makeAttributeGetter({
	buffer: getGetter(DataViewPrototype, `buffer`),
	byteLength: getGetter(DataViewPrototype, `byteLength`),
	byteOffset: getGetter(DataViewPrototype, `byteOffset`)
})

const getDOMExceptionAttributes = makeAttributeGetter({
	name: getGetter(DOMExceptionPrototype, `name`),
	message: getGetter(DOMExceptionPrototype, `message`),
	code: getGetter(DOMExceptionPrototype, `code`)
})

const RequestPrototype = Request.prototype

const getRequestAttributes = makeAttributeGetter({
	method: getGetter(RequestPrototype, `method`),
	url: getGetter(RequestPrototype, `url`),
	headers: getGetter(RequestPrototype, `headers`),
	destination: getGetter(RequestPrototype, `destination`),
	referrer: getGetter(RequestPrototype, `referrer`),
	referrerPolicy: getGetter(RequestPrototype, `referrerPolicy`),
	mode: getGetter(RequestPrototype, `mode`),
	credentials: getGetter(RequestPrototype, `credentials`),
	cache: getGetter(RequestPrototype, `cache`),
	redirect: getGetter(RequestPrototype, `redirect`),
	integrity: getGetter(RequestPrototype, `integrity`),
	keepalive: getGetter(RequestPrototype, `keepalive`),
	isReloadNavigation: getGetter(RequestPrototype, `isReloadNavigation`),
	isHistoryNavigation: getGetter(RequestPrototype, `isHistoryNavigation`),
	signal: getGetter(RequestPrototype, `signal`),
	body: getGetter(RequestPrototype, `body`),
	bodyUsed: getGetter(RequestPrototype, `bodyUsed`),
	duplex: getGetter(RequestPrototype, `duplex`)
})

const PromiseThen =
	(...args: [ target: any, onResolve?: (value: any) => any, onReject?: (value: any) => any ]): Promise<unknown> =>
		Promise.prototype.then.call(...args)

const nop = () => {}

const suppressUncaughtReject = <T>(value: T) => {
	try {
		PromiseThen(value, undefined, nop)
	} catch {}

	return value
}

let PromiseRejectionEventGetPromise: ((v: any) => Promise<any>) | undefined
let PromiseRejectionEventGetReason: ((v: any) => any) | undefined

if (typeof PromiseRejectionEvent == `function`) {
	const getPromise = getGetter(PromiseRejectionEvent.prototype, `promise`)

	if (getPromise)
		PromiseRejectionEventGetPromise = v => suppressUncaughtReject(getPromise(v))

	PromiseRejectionEventGetReason = getGetter(PromiseRejectionEvent.prototype, `reason`)
}

const getPromiseRejectionEventAttributes =
	makeAttributeGetter({ promise: PromiseRejectionEventGetPromise, reason: PromiseRejectionEventGetReason })

const EventPrototype = Event.prototype

const getEventAttributes = makeAttributeGetter({
	target: getGetter(EventPrototype, `target`),
	currentTarget: getGetter(EventPrototype, `currentTarget`),
	srcElement: getGetter(EventPrototype, `srcElement`),
	type: getGetter(EventPrototype, `type`),
	cancelable: getGetter(EventPrototype, `cancelable`),
	defaultPrevented: getGetter(EventPrototype, `defaultPrevented`),
	timeStamp: getGetter(EventPrototype, `timeStamp`),
	returnValue: getGetter(EventPrototype, `returnValue`),
	bubbles: getGetter(EventPrototype, `bubbles`),
	composed: getGetter(EventPrototype, `composed`),
	eventPhase: getGetter(EventPrototype, `eventPhase`),
	cancelBubble: getGetter(EventPrototype, `cancelBubble`)
})

const ResponsePrototype = Response.prototype

const getResponseAttributes = makeAttributeGetter({
	body: getGetter(ResponsePrototype, `body`),
	bodyUsed: getGetter(ResponsePrototype, `bodyUsed`),
	headers: getGetter(ResponsePrototype, `headers`),
	ok: getGetter(ResponsePrototype, `ok`),
	redirected: getGetter(ResponsePrototype, `redirected`),
	status: getGetter(ResponsePrototype, `status`),
	statusText: getGetter(ResponsePrototype, `statusText`),
	type: getGetter(ResponsePrototype, `type`),
	url: getGetter(ResponsePrototype, `url`)
})

const formatName = (name: string): string => /^[\w$]+$/.test(name) ? name : JSON.stringify(name)

const symbolToJsodd = (symbol: symbol, friendlyNames: FriendlyNames, valueName?: string): string => {
	const symbolKey = Symbol.keyFor(symbol)

	if (symbolKey != undefined)
		return `Symbol.for(${JSON.stringify(symbolKey)})`

	if (friendlyNames.map.has(symbol))
		return friendlyNames.map.get(symbol)!

	if (valueName != undefined)
		friendlyNames.map.set(symbol, valueName || `.`)

	let jsodd = `Symbol(${symbol.description == null ? `` : JSON.stringify(symbol.description)})`

	if (valueName == undefined) {
		jsodd += ` *${++friendlyNames.symbolReferenceCount}`
		friendlyNames.map.set(symbol, jsodd)
	}

	return jsodd
}

export type FriendlyNames = { map: Map<object | symbol, string>, symbolReferenceCount: number }

export const cloneFriendlyNames = ({ map = new Map, symbolReferenceCount = 0 }: FriendlyNames) =>
	({ map: new Map(map), symbolReferenceCount })

type FriendlyNamesQueue = { name: string, value: object }[]

const makeFriendlyNamesQueue = (values: Record<string, unknown>, friendlyNames: FriendlyNames): FriendlyNamesQueue =>
	Object.getOwnPropertyNames(values).flatMap(name => {
		const { value } = getDescriptor(values, name)

		if (isSymbol(value))
			friendlyNames.map.set(value, name)
		else if (isObject(value)) {
			friendlyNames.map.set(value, name)

			return { name, value }
		}

		return []
	})

const mapFriendlyNames = (queue: FriendlyNamesQueue, friendlyNames: FriendlyNames): void => {
	let symbolReferenceCount = 0

	const nameKey = (key: string | symbol): string => {
		if (typeof key == `string`)
			return key

		const symbolKey = Symbol.keyFor(key)

		if (symbolKey)
			return `[Symbol.for(${JSON.stringify(symbolKey)})]`

		if (friendlyNames.map.has(key))
			return `[${friendlyNames.map.get(key)}]`

		const name =
			`Symbol(${key.description == null ? `` : JSON.stringify(key.description)}) #${++symbolReferenceCount}`

		friendlyNames.map.set(key, name)

		return `[${name}]`
	}

	while (queue.length) {
		const item = queue.shift()!

		for (const key of getKeys(item.value)) {
			const descriptor = getDescriptor(item.value, key)!
			const keyName = nameKey(key)

			if ("value" in descriptor) {
				if (
					(isObject(descriptor.value) || isSymbol(descriptor.value)) &&
					!friendlyNames.map.has(descriptor.value)
				) {
					const valueName = `${item.name}${keyName[0] == `[` ? `` : `.`}${keyName}`

					friendlyNames.map.set(descriptor.value, valueName)

					if (typeof descriptor.value != `symbol`)
						queue.push({ name: valueName, value: descriptor.value })
				}
			} else {
				if (descriptor.get && !friendlyNames.map.has(descriptor.get)) {
					const valueName = `${item.name}.<get ${keyName}>`

					friendlyNames.map.set(descriptor.get, valueName)
					queue.push({ name: valueName, value: descriptor.get })
				}

				if (descriptor.set && !friendlyNames.map.has(descriptor.set)) {
					const valueName = `${item.name}.<set ${keyName}>`

					friendlyNames.map.set(descriptor.set, valueName)
					queue.push({ name: valueName, value: descriptor.set })
				}
			}
		}

		const prototype = getPrototype(item.value)

		if (prototype && !friendlyNames.map.has(prototype)) {
			const prototypeName = `${item.name}.<prototype>`

			friendlyNames.map.set(prototype, prototypeName)
			queue.push({ name: prototypeName, value: prototype })
		}
	}
}

const functionNameOrLengthDescriptorIsProper = (function_: object, descriptor: PropertyDescriptor) =>
	!descriptor.enumerable && !descriptor.writable && descriptor.configurable != Object.isSealed(function_)

const functionNameDescriptorIsProper = (function_: object, descriptor?: PropertyDescriptor):
	descriptor is { configurable: boolean, enumerable: false, value: string, writable: false } =>
	!!(typeof descriptor?.value == `string` && functionNameOrLengthDescriptorIsProper(function_, descriptor))

const functionLengthDescriptorIsProper = (function_: object, descriptor?: PropertyDescriptor):
	descriptor is { configurable: boolean, enumerable: false, value: number, writable: false } =>
	!!(typeof descriptor?.value == `number` && functionNameOrLengthDescriptorIsProper(function_, descriptor))

const angleNames = (toAngleName: Record<string, object | symbol | undefined>): Record<string, object | symbol> =>
	Object.fromEntries(
		Object.entries(toAngleName)
			.flatMap(([ key, value ]) => value ? [ [ `<${key}>`, value ] ] : [])
	)

const builtinFriendlyNames: FriendlyNames = { map: new Map, symbolReferenceCount: 0 }

{
	const queue = makeFriendlyNamesQueue(globalThis, builtinFriendlyNames)

	queue.push(...makeFriendlyNamesQueue({
		// Node.js Internal Symbols
		'<Node.js Event "type" symbol>': getSymbol(eventInstanceSymbolKeys, `type`),
		'<Node.js Event "kTarget" symbol>': getSymbol(eventInstanceSymbolKeys, `kTarget`),
		'<Node.js Event "kIsBeingDispatched" symbol>': getSymbol(eventInstanceSymbolKeys, `kIsBeingDispatched`),
		'<Node.js Event "kInPassiveListener" symbol>': getSymbol(eventInstanceSymbolKeys, `kInPassiveListener`),

		...angleNames({
			TypedArray,
			GeneratorFunction,
			AsyncGenerator: getPrototype((async function*() { }).prototype)!.constructor,
			AsyncFunction: (async () => { }).constructor,
			GeneratorPrototype: GeneratorFunction.prototype.prototype,
			ArrayIteratorPrototype: getPrototype(arrayIterator)!,
			StringIteratorPrototype: getPrototype(``[Symbol.iterator]())!,
			MapIteratorPrototype: getPrototype(new Map().values())!,
			SetIteratorPrototype: getPrototype(new Set().values())!,
			IteratorHelperPrototype: (arrayIterator.map && getPrototype(arrayIterator.map(_ => _))!) as object | undefined,
			RegExpStringIteratorHelper: getPrototype(/a/[Symbol.matchAll](``))!,
			SegmentsPrototype: getPrototype(segments)!,
			SegmentsIteratorPrototype: getPrototype(segments[Symbol.iterator]())!,
			WrapForValidIteratorPrototype: typeof Iterator == `function` ? getPrototype(Iterator.from({} as any))! : undefined,
			V8ErrorStackGetter: v8ErrorStackDescriptor?.get,
			V8ErrorStackSetter: v8ErrorStackDescriptor?.set,
			NodeJsBlobHandleSymbol,
			NodeJsBlobLengthSymbol: getSymbol(nodeBlobSymbolKeys, `kLength`),
			NodeJsBlobTypeSymbol: getSymbol(nodeBlobSymbolKeys, `kType`),
			NodeJsInternalBlob: NodeJsBlobHandleSymbol && emptyBlob[NodeJsBlobHandleSymbol].constructor,
			NodeJsFileStateSymbol,
			NodeJsFileState: NodeJsFileStateSymbol && emptyFile[NodeJsFileStateSymbol].constructor,
			NodeJsDOMExceptionMessagingCloneSymbol: getSymbol(domExceptionPrototypeSymbolKeys, `messaging_clone_symbol`),
			NodeJsDOMExceptionMessagingDeserializeSymbol: getSymbol(domExceptionPrototypeSymbolKeys, `messaging_deserialize_symbol`),
			NodeJsEventTargetNewListenerSymbol: getSymbol(eventTargetPrototypeSymbolKeys, `kNewListener`),
			NodeJsEventTargetRemoveListenerSymbol: getSymbol(eventTargetPrototypeSymbolKeys, `kRemoveListener`),
			NodeJsEventTargetRemoveWeakListenerHelperSymbol: getSymbol(eventTargetPrototypeSymbolKeys, `kRemoveWeakListenerHelper`),
			NodeJsEventTargetCreateEventSymbol: getSymbol(eventTargetPrototypeSymbolKeys, `kCreateEvent`),
			NodeJsAbortControllerMakeTransferableSymbol: getSymbol(getSymbols(AbortController), `kMakeTransferable`),
			NodeJsAbortSignalMessagingTransferSymbol: getSymbol(abortSignalSymbolKeys, `messaging_transfer_symbol`),
			NodeJsAbortSignalMessagingTransferListSymbol: getSymbol(abortSignalSymbolKeys, `messaging_transfer_list_symbol`),
			NodeJsEventTargetEventsSymbol,
			NodeJsEventTargetEventsMaxEventTargetListenersSymbol: getSymbol(eventTargetInstanceSymbolKeys, `events.maxEventTargetListeners`),
			NodeJsEventTargetEventsMaxEventTargetListenersWarnedSymbol: getSymbol(eventTargetInstanceSymbolKeys, `events.maxEventTargetListenersWarned`),
			NodeJsEventTargetHandlersSymbol: getSymbol(eventTargetInstanceSymbolKeys, `kHandlers`),
			NodeJsSafeMap: NodeJsEventTargetEventsSymbol && (eventTarget as any)[NodeJsEventTargetEventsSymbol]?.constructor
		})
	}, builtinFriendlyNames))

	mapFriendlyNames(queue, builtinFriendlyNames)
}

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
		else if (isSymbol(value))
			o += symbolToJsodd(value, friendlyNames, valueName)
		else if (JSON.isRawJSON?.(value)) {
			o += `JSON.rawJSON(${JSON.stringify(value.rawJSON)})`
		} else if (isObject(value)) {
			if (friendlyNames.map.has(value))
				o += friendlyNames.map.get(value)!
			else {
				const indent = () => indentString.repeat(indentLevel)

				friendlyNames.map.set(value, valueName || `.`)

				if (isActuallyFrozen(value))
					o += `frozen `
				else if (Object.isSealed(value))
					o += `sealed `
				else if (!isExtensible(value))
					o += `unextensible `

				const keys = new Set(getKeys(value))

				if (isFunction(value)) {
					if (isTerseMethod)
						keys.delete(`name`)
					else {
						o += `function `

						const nameDescriptor = getDescriptor(value, `name`)

						if (functionNameDescriptorIsProper(value, nameDescriptor)) {
							o += formatName(nameDescriptor.value)
							keys.delete(`name`)
						}
					}

					const lengthDescriptor = getDescriptor(value, `length`)

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
				let typedArrayTag

				if (typedArrayAttributes.length)
					o += `${(typedArrayTag = TypedArrayGetTag?.(value)) ?? `TypedArray`} `

				const dataViewAttributes = getDataViewAttributes(value)

				if (dataViewAttributes.length)
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

				const isPromise = tryCatch(() => !!PromiseThen(value, undefined, nop), () => false)

				if (isPromise)
					o += `Promise `

				const symbolObjectValue = tryCatch(() => Symbol.prototype.valueOf.call(value))

				if (symbolObjectValue)
					o += `Symbol `

				const domExceptionAttributes = getDOMExceptionAttributes(value)

				if (domExceptionAttributes.length)
					o += `DOMException `
				else if (stack != undefined)
					o += `Error `

				const dateTime = tryCatch(() => Date.prototype.getTime.call(value))

				if (dateTime != undefined)
					o += `Date `

				const blobAttributes = getBlobAttributes(value)
				const fileAttributes = getFileAttributes(value)

				if (fileAttributes.length)
					o += `File `
				else if (blobAttributes.length)
					o += `Blob `

				const headersEntries = tryCatch(() =>
					Headers.prototype.entries.call(value)
						.map(([ key, value ], index): [ number, string, string ] => [ index, key, value ])
						.toArray()
				)

				if (headersEntries)
					o += `Headers `

				const requestAttributes = getRequestAttributes(value)

				if (requestAttributes.length)
					o += `Request `

				const promiseRejectionEventAttributes = getPromiseRejectionEventAttributes(value)

				if (promiseRejectionEventAttributes.length)
					o += `PromiseRejectionEvent `

				const eventAttributes = getEventAttributes(value)

				if (eventAttributes.length)
					o += `Event `

				const responseAttributes = getResponseAttributes(value)

				if (responseAttributes.length)
					o += `Response `

				const isArray = Array.isArray(value) || typedArrayAttributes.length

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
					stringifyEntry(`<primitive>`, `${symbolToJsodd(symbolObjectValue, friendlyNames, `${valueName}.<primitive>`)}`)

				const stringifyProperties = (value: object, keys: Set<string | symbol>, isStatic: boolean): void => {
					for (const key of keys) {
						const descriptor = getDescriptor(value, key)!
						prefix = `\n${indent()}`

						if (isStatic)
							prefix += `static `

						if (!descriptor.configurable && !Object.isSealed(value))
							prefix += `unconfigurable `

						if (!descriptor.enumerable)
							prefix += `unenumerable `

						if (descriptor.writable == false && !isActuallyFrozen(value))
							prefix += `readonly `

						const keyName = isSymbol(key) ? `[${symbolToJsodd(key, friendlyNames)}]` : formatName(key)
						const expectedFunctionName = typeof key == `string` ? key : `[${key.description}]`

						const stringifyKeyAndValue = (value: unknown, expectedFunctionName: string, name: string) => {
							let isTerseMethod = false

							if (isFunction(value) && !friendlyNames.map.has(value)) {
								const nameDescriptor = getDescriptor(value, `name`)
								const lengthDescriptor = getDescriptor(value, `length`)

								isTerseMethod = functionNameDescriptorIsProper(value, nameDescriptor) && nameDescriptor.value == expectedFunctionName && functionLengthDescriptorIsProper(value, lengthDescriptor)
							}

							if (!isTerseMethod)
								o += `: `

							stringify(value, name, isTerseMethod)
						}

						if (`value` in descriptor) {
							o += `${prefix}${keyName}`
							stringifyKeyAndValue(descriptor.value, expectedFunctionName, `${valueName}${valueName && valueName != `.` && keyName[0] == `[` ? `` : `.`}${keyName}`)
						} else {
							if (descriptor.get) {
								o += `${prefix}get ${keyName}`
								stringifyKeyAndValue(descriptor.get, `get ${expectedFunctionName}`, `${valueName}.<get ${keyName}>`)
							}

							if (descriptor.set) {
								o += `${prefix}set ${keyName}`
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

				const stringifyField = (key: string, value: unknown): void => {
					o += `\n${indent()}${key}: `
					stringify(value, `${valueName}.${key}`)
				}

				const stringifyAttributes = (entries: [ name: string, value: any ][]) => {
					for (const [ name, value ] of entries)
						stringifyField(`<${name}>`, value)
				}

				stringifyAttributes(typedArrayAttributes)
				stringifyAttributes(dataViewAttributes)
				stringifyAttributes(domExceptionAttributes)

				if (dateTime != undefined)
					stringifyField(`<time>`, dateTime)

				stringifyAttributes(blobAttributes)
				stringifyAttributes(fileAttributes)

				if (headersEntries) {
					for (const [ index, key, value ] of headersEntries) {
						o += `\n${indent()}<entry ${index} key>: `
						stringify(key, `${valueName}.<entry ${index} key>`)
						o += `\n${indent()}<entry ${index} value>: `
						stringify(value, `${valueName}.<entry ${index} value>`)
					}
				}

				stringifyAttributes(requestAttributes)
				stringifyAttributes(promiseRejectionEventAttributes)
				stringifyAttributes(eventAttributes)
				stringifyAttributes(responseAttributes)

				const prototype = getPrototype(value)

				const expectedPrototype =
					regexSource ?
						RegExp.prototype
					: mapEntries ?
						Map.prototype
					: isFunction(value) ?
						Function.prototype
					: Array.isArray(value) ?
						Array.prototype
					: domExceptionAttributes.length ?
						DOMExceptionPrototype
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
					: typedArrayAttributes.length ?
						typedArrayTag ?
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
							}[typedArrayTag]
						: undefined
					: booleanObjectValue != undefined ?
						Boolean.prototype
					: numberObjectValue != undefined ?
						Number.prototype
					: stringObjectValue != undefined ?
						String.prototype
					: dataViewAttributes.length ?
						DataViewPrototype
					: isWeakRef ?
						WeakRef.prototype
					: isPromise ?
						Promise.prototype
					: symbolObjectValue ?
						Symbol.prototype
					: dateTime != undefined ?
						Date.prototype
					: fileAttributes.length ?
						File.prototype
					: blobAttributes?.length ?
						Blob.prototype
					: headersEntries ?
						Headers.prototype
					: requestAttributes.length ?
						RequestPrototype
					: promiseRejectionEventAttributes.length ?
						PromiseRejectionEvent.prototype
					: eventAttributes.length ?
						EventPrototype
					: responseAttributes.length ?
						Response.prototype
					: Object.prototype

				if (prototype != expectedPrototype) {
					o += `\n${indent()}<prototype>: `
					stringify(prototype, `${valueName}.<prototype>`)
				}

				indentLevel--

				if (
					keys.size || mapEntries?.length || prototype != expectedPrototype || stack != undefined ||
					setValues?.length || arrayBufferByteLength != undefined ||
					sharedArrayBufferByteLength != undefined || typedArrayAttributes.length ||
					booleanObjectValue != undefined || numberObjectValue != undefined ||
					stringObjectValue != undefined || dataViewAttributes.length || symbolObjectValue ||
					domExceptionAttributes.length || dateTime != undefined || blobAttributes?.length ||
					headersEntries?.length || requestAttributes.length || promiseRejectionEventAttributes.length ||
					eventAttributes.length || responseAttributes.length
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

	expect.extend({
		toMatchPattern(
			got: unknown,
			template: readonly string[],
			...substitutions: (number | RegExp | ((matches: string[]) => string))[]
		) {
			if (typeof got != `string`)
				return { message: () => `input was not a string`, pass: false }

			let toCheck = got
			const indentCount = template[0]!.match(/^\n(\t+)/)?.[1]!.length

			if (indentCount)
				toCheck = toCheck.replaceAll(/^/gm, `\t`.repeat(indentCount))

			toCheck = toCheck.trim()

			const matches: string[] = []

			for (let i = 0; i < substitutions.length; i++) {
				const subtemplate = i ? template[i]! : template[i]!.trimStart()

				if (!toCheck.startsWith(subtemplate))
					return { message: () => `did not match template`, pass: false, actual: toCheck.slice(0, subtemplate.length), expected: subtemplate }

				toCheck = toCheck.slice(subtemplate.length)

				const substitution = substitutions[i]!

				if (typeof substitution == `number`) {
					if (!Number.isInteger(substitution))
						throw TypeError(`substitution match index must be integer`)

					if (substitution >= matches.length)
						throw TypeError(`substitution match index too high`)

					const match = matches[substitution]!

					if (!toCheck.startsWith(match))
						return { message: () => `did not match substitution`, pass: false, actual: toCheck.slice(0, match.length), expected: match }

					matches.push(match)
					toCheck = toCheck.slice(match.length)
				} else if (isFunction(substitution)) {
					const match = substitution(matches)

					if (!toCheck.startsWith(match))
						return { message: () => `did not match substitution`, pass: false, actual: toCheck.slice(0, match.length), expected: match }

					matches.push(match)
					toCheck = toCheck.slice(match.length)
				} else {
					const result = toCheck.match(RegExp(`^${substitution.source}`))

					if (!result)
						return { message: () => `did not match substitution`, pass: false, actual: toCheck, expected: substitution }

					matches.push(result[0])
					toCheck = toCheck.slice(result[0].length)
				}
			}

			const lastTemplate = template.at(-1)!.trimEnd()

			if (toCheck != lastTemplate)
				return { message: () => `did not match template`, pass: false, actual: toCheck, expected: lastTemplate }

			return { message: () => ``, pass: true }
		}
	})

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
				[Symbol("foo") *1]: Symbol("foo") *1
			}"
		`)
	})

	test(`symbol used as key twice`, () => {
		const symbol = Symbol(`foo`)

		expect(toJsodd({ a: { [symbol]: symbol }, b: { [symbol]: symbol } })).toMatchInlineSnapshot(`
			"{
				a: {
					[Symbol("foo") *1]: Symbol("foo") *1
				}
				b: {
					[Symbol("foo") *1]: Symbol("foo") *1
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

	test(`prototype-less map`, () => {
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

		expect(toJsodd({ [a]: b, [b]: c, [c]: a })).toMatchInlineSnapshot(`
			"{
				[Symbol("a") *1]: Symbol("b")
				[.[Symbol("a") *1]]: Symbol("c")
				[.[.[Symbol("a") *1]]]: Symbol("a") *1
			}"
		`)
	})

	test(`nested symbol key to symbol key to symbol key`, () => {
		const a = Symbol(`a`)
		const b = Symbol(`b`)
		const c = Symbol(`c`)

		expect(toJsodd({ foo: { [a]: b, [b]: c, [c]: a } })).toMatchInlineSnapshot(`
			"{
				foo: {
					[Symbol("a") *1]: Symbol("b")
					[.foo[Symbol("a") *1]]: Symbol("c")
					[.foo[.foo[Symbol("a") *1]]]: Symbol("a") *1
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

	test(`function with overridden name and length`, () => {
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
		expect(toJsodd(getDescriptor(TypedArrayPrototype, Symbol.toStringTag))).toMatchInlineSnapshot(`
			"{
				get: <TypedArray>.prototype.<get [Symbol.toStringTag]>
				set: undefined
				enumerable: false
				configurable: true
			}"
		`)
	})

	test(`no clashing symbol references`, () => {
		const s = Symbol(`foo`)

		const friendlyNames: FriendlyNames = { map: new Map, symbolReferenceCount: 0 }

		mapFriendlyNames(makeFriendlyNamesQueue({ foo: Object.assign(Object.create(null), ({ [s]: 1 })) }, friendlyNames), friendlyNames)

		expect(toJsodd({ [Symbol("bar")]: s }, { friendlyNames })).toMatchInlineSnapshot(`
			"{
				[Symbol("bar") *1]: Symbol("foo") #1
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
			expect(toJsodd(JSON.rawJSON!("10000000000000001"))).toMatchInlineSnapshot(`"JSON.rawJSON("10000000000000001")"`)
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

	test(`date`, () => {
		expect(toJsodd(new Date(1770292742963))).toMatchInlineSnapshot(`
			"Date {
				<time>: 1770292742963
			}"
		`)
	})

	test(`date with different prototype`, () => {
		const date = new Date(1770293653474)

		Reflect.setPrototypeOf(date, Object.prototype)

		expect(toJsodd(date)).toMatchInlineSnapshot(`
			"Date {
				<time>: 1770293653474
				<prototype>: Object.prototype
			}"
		`)
	})

	test(`blob`, () => {
		expect(
			toJsodd(new Blob([ `foo` ], { type: `text/plain`, endings: `native` }))
		).toMatchInlineSnapshot(`
			"Blob {
				[<NodeJsBlobHandleSymbol>]: {
					<prototype>: <NodeJsInternalBlob>.prototype
				}
				[<NodeJsBlobLengthSymbol>]: 3
				[<NodeJsBlobTypeSymbol>]: "text/plain"
				<size>: 3
				<type>: "text/plain"
			}"
		`)
	})

	test(`file`, () => {
		expect(toJsodd(new File(
			[ `hello world` ],
			`hi.txt`,
			{ endings: `transparent`, lastModified: 1770302972135, type: `text/plain` }
		))).toMatchInlineSnapshot(`
			"File {
				[<NodeJsBlobHandleSymbol>]: {
					<prototype>: <NodeJsInternalBlob>.prototype
				}
				[<NodeJsBlobLengthSymbol>]: 11
				[<NodeJsBlobTypeSymbol>]: "text/plain"
				[<NodeJsFileStateSymbol>]: {
					name: "hi.txt"
					lastModified: 1770302972135
					<prototype>: <NodeJsFileState>.prototype
				}
				<size>: 11
				<type>: "text/plain"
				<lastModified>: 1770302972135
				<name>: "hi.txt"
			}"
		`)
	})

	test(`headers`, () => {
		expect(toJsodd(new Headers({ foo: `bar` }))).toMatchInlineSnapshot(`
			"Headers {
				<entry 0 key>: "foo"
				<entry 0 value>: "bar"
			}"
		`)
	})

	test(`request`, () => {
		expect(toJsodd(new Request(`https://samual.uk/`, { headers: { foo: `bar` } }))).toMatchInlineSnapshot(`
			"Request {
				<method>: "GET"
				<url>: "https://samual.uk/"
				<headers>: Headers {
					<entry 0 key>: "foo"
					<entry 0 value>: "bar"
				}
				<destination>: ""
				<referrer>: "about:client"
				<referrerPolicy>: ""
				<mode>: "cors"
				<credentials>: "same-origin"
				<cache>: "default"
				<redirect>: "follow"
				<integrity>: ""
				<keepalive>: false
				<isReloadNavigation>: false
				<isHistoryNavigation>: false
				<signal>: {
					[<NodeJsEventTargetEventsSymbol>]: Map {
						<prototype>: <NodeJsSafeMap>.prototype
					}
					[<NodeJsEventTargetEventsMaxEventTargetListenersSymbol>]: 0
					[<NodeJsEventTargetEventsMaxEventTargetListenersWarnedSymbol>]: false
					[<NodeJsEventTargetHandlersSymbol>]: Map {
						<prototype>: <NodeJsSafeMap>.prototype
					}
					[Symbol("kAborted") *1]: false
					[Symbol("kReason") *2]: undefined
					[Symbol("kComposite") *3]: false
					<prototype>: AbortSignal.prototype
				}
				<body>: null
				<bodyUsed>: false
				<duplex>: "half"
			}"
		`)
	})

	test(`empty headers`, () => {
		expect(toJsodd(new Headers)).toMatchInlineSnapshot(`"Headers {}"`)
	})

	test(`event target`, () => {
		expect(toJsodd(new EventTarget)).toMatchInlineSnapshot(`
			"{
				[<NodeJsEventTargetEventsSymbol>]: Map {
					<prototype>: <NodeJsSafeMap>.prototype
				}
				[<NodeJsEventTargetEventsMaxEventTargetListenersSymbol>]: 10
				[<NodeJsEventTargetEventsMaxEventTargetListenersWarnedSymbol>]: false
				[<NodeJsEventTargetHandlersSymbol>]: Map {
					<prototype>: <NodeJsSafeMap>.prototype
				}
				<prototype>: EventTarget.prototype
			}"
		`)
	})

	test(`dom exception`, () => {
		const error = new DOMException(`foo`)

		error.stack = `bar`

		expect(toJsodd(error)).toMatchInlineSnapshot(`
			"DOMException {
				unenumerable get stack: <V8ErrorStackGetter>
				unenumerable set stack: <V8ErrorStackSetter>
				<stack>: "bar"
				<name>: "Error"
				<message>: "foo"
				<code>: 0
			}"
		`)
	})

	test(`event`, () => {
		expect(toJsodd(new Event(`foo`))).toMatchPattern`
			Event {
				[<Node.js Event "type" symbol>]: "foo"
				[<Node.js Event "kTarget" symbol>]: null
				[<Node.js Event "kIsBeingDispatched" symbol>]: false
				[<Node.js Event "kInPassiveListener" symbol>]: false
				<target>: null
				<currentTarget>: null
				<srcElement>: null
				<type>: "foo"
				<cancelable>: false
				<defaultPrevented>: false
				<timeStamp>: ${/\d+/}.${/\d+/}
				<returnValue>: true
				<bubbles>: false
				<composed>: false
				<eventPhase>: 0
				<cancelBubble>: false
			}
		`
	})

	test(`empty response`, () => {
		expect(toJsodd(new Response)).toMatchInlineSnapshot(`
			"Response {
				<body>: null
				<bodyUsed>: false
				<headers>: Headers {}
				<ok>: true
				<redirected>: false
				<status>: 200
				<statusText>: ""
				<type>: "default"
				<url>: ""
			}"
		`)
	})
}
