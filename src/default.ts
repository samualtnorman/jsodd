const tryCatch = <TExecutorReturn, TOnErrorReturn = undefined>(
	executor: () => TExecutorReturn,
	onError?: (error: unknown) => TOnErrorReturn
): TExecutorReturn | TOnErrorReturn => {
	try {
		return executor()
	} catch (error) {
		return onError?.(error) as any
	}
}
const TypedArray = Object.getPrototypeOf(Uint8Array)
const GeneratorFunction = (function* () {}).constructor
const GeneratorPrototype = GeneratorFunction.prototype.prototype
const AsyncFunction = (async () => {}).constructor
const AsyncGenerator = Object.getPrototypeOf((async function* () {}).prototype).constructor

const regExpSourceGetter = Object.getOwnPropertyDescriptor(RegExp.prototype, "source")!.get!
const regExpFlagsGetter = Object.getOwnPropertyDescriptor(RegExp.prototype, "flags")!.get!
const errorStackGetter = Object.getOwnPropertyDescriptor(Error(), `stack`)?.get || Object.getOwnPropertyDescriptor(Error.prototype, `stack`)?.get
const arrayBufferByteLengthGetter = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, `byteLength`)!.get!
const TypedArrayPrototypeDescriptors = Object.getOwnPropertyDescriptors(TypedArray.prototype) as any

const getRegExpSource = (regex: unknown): string => regExpSourceGetter.call(regex)
const getRegExpFlags = (regex: unknown): string => regExpFlagsGetter.call(regex)
const getErrorStack = (error: unknown): string | undefined => errorStackGetter?.call(error)
const getArrayBufferByteLength = (value: unknown): number | undefined => arrayBufferByteLengthGetter.call(value)

const getTypedArrayAttributes = (value: unknown) => tryCatch(() => ({
	buffer: TypedArrayPrototypeDescriptors.buffer.get.call(value),
	byteLength: TypedArrayPrototypeDescriptors.byteLength.get.call(value),
	byteOffset: TypedArrayPrototypeDescriptors.byteOffset.get.call(value),
	length: TypedArrayPrototypeDescriptors.length.get.call(value),
	tag: TypedArrayPrototypeDescriptors[Symbol.toStringTag].get.call(value) as string
}))

const formatName = (name: string): string => /^[\w$]+$/.test(name) ? name : JSON.stringify(name)

const symbolToDebugString = (symbol: symbol, names: Map<unknown, string>, valueName: string): string => {
	const symbolKey = Symbol.keyFor(symbol)

	if (symbolKey != undefined)
		return `Symbol.for(${JSON.stringify(symbolKey)})`

	if (names.has(symbol))
		return names.get(symbol)!

	names.set(symbol, valueName || `.`)

	return `Symbol(${symbol.description == null ? `` : JSON.stringify(symbol.description)})`
}

const defaultDebugNames = getDebugNames({
	Function,
	Object,
	Boolean,
	Symbol,

	Error,
	AggregateError,
	EvalError,
	RangeError,
	ReferenceError,
	SuppressedError,
	SyntaxError,
	TypeError,
	URIError,
	// InternalError,

	Number,
	BigInt,
	Math,
	Date,
	// Temporal,

	String,
	RegExp,

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
	Float16Array,
	Float32Array,
	Float64Array,

	Map,
	Set,
	WeakMap,
	WeakSet,

	ArrayBuffer,
	SharedArrayBuffer,
	DataView,
	Atomics,
	JSON,

	eval,
	isFinite,
	isNaN,
	parseFloat,
	parseInt,
	decodeURI,
	decodeURIComponent,
	encodeURI,
	encodeURIComponent,
	escape,
	unescape,

	AsyncDisposableStack,
	"<AsyncFunction>": AsyncFunction,
	"<AsyncGenerator>": AsyncGenerator,
	Iterator,
	"<GeneratorFunction>": GeneratorFunction,
	"<GeneratorPrototype>": GeneratorPrototype
})

export function toDebugString(
	value: unknown,
	{ indentLevel = 0, indentString = `\t`, names = new Map(defaultDebugNames), valueName = ``, symbolReferenceCount = 0 } = {}
): string {
	let o = ``

	stringify(value, valueName)

	return o

	function stringify(value: unknown, valueName: string): void {
		if (typeof value == `bigint`)
			o += `${value}n`
		else if (typeof value == `string`)
			o += JSON.stringify(value)
		else if (typeof value == `symbol`)
			o += symbolToDebugString(value, names, valueName)
		else if (typeof value == `function` || (value && typeof value == `object`)) {
			if (names.has(value))
				o += names.get(value)!
			else {
				const indent = () => indentString.repeat(indentLevel)

				names.set(value, valueName || `.`)

				if (Object.isFrozen(value))
					o += `frozen `
				else if (Object.isSealed(value))
					o += `sealed `
				else if (!Object.isExtensible(value))
					o += `unextensible `

				const descriptors = Object.getOwnPropertyDescriptors(value) as Record<keyof any, PropertyDescriptor>

				if (typeof value == `function`) {
					o += `function `

					if (typeof descriptors.name?.value == `string` && !descriptors.name.writable && !descriptors.name.enumerable && descriptors.name.configurable) {
						o += formatName(descriptors.name.value)
						delete descriptors.name
					}

					if (typeof descriptors.length?.value == `number` && !descriptors.length.writable && !descriptors.length.enumerable && descriptors.length.configurable) {
						o += `(${descriptors.length.value}) `
						delete descriptors.length
					}
				}

				const regexSource = tryCatch(() => `/${getRegExpSource(value)}/${getRegExpFlags(value)} `)

				if (regexSource != undefined)
					o += regexSource

				const mapEntries = tryCatch(() => Map.prototype.entries.call(value).map(([ key, value ], index) => [ index, key, value ]).toArray())

				if (mapEntries)
					o += `Map `

				const stack = tryCatch(() => getErrorStack(value))

				if (stack != undefined)
					o += `Error `

				const setValues = tryCatch(() => Set.prototype.values.call(value).map((value, index) => [ index, value ]).toArray())

				if (setValues)
					o += `Set `

				const isWeakMap = tryCatch(() => !WeakMap.prototype.has.call(value, undefined as any), () => false)

				if (isWeakMap)
					o += `WeakMap `

				const isWeakSet = tryCatch(() => !WeakSet.prototype.has.call(value, undefined as any), () => false)

				if (isWeakSet)
					o += `WeakSet `

				const arrayBufferByteLength = tryCatch(() => getArrayBufferByteLength(value))

				if (arrayBufferByteLength != undefined)
					o += `ArrayBuffer `

				const typedArrayAttributes = getTypedArrayAttributes(value)

				if (typedArrayAttributes)
					o += `${typedArrayAttributes.tag} `

				const isArray = Array.isArray(value) || typedArrayAttributes

				o += isArray ? `[` : `{`
				indentLevel++

				const keys = [ ...Object.getOwnPropertyNames(descriptors), ...Object.getOwnPropertySymbols(descriptors) ]

				for (const key of keys) {
					const descriptor = descriptors[key]!

					let prefix = `\n${indent()}`

					if (descriptor.configurable == false && !Object.isSealed(value))
						prefix += `unconfigurable `

					if (descriptor.enumerable == false)
						prefix += `unenumerable `

					if (descriptor.writable == false && !Object.isFrozen(value))
						prefix += `readonly `

					let keyString
					let keyName

					if (typeof key == `symbol`) {
						const symbolKey = Symbol.keyFor(key)

						if (symbolKey != undefined)
							keyString = keyName = `[Symbol.for(${JSON.stringify(symbolKey)})]`
						else if (names.has(key))
							keyString = keyName = `[${names.get(key)!}]`
						else {
							keyString = `[${symbolToDebugString(key, names, `<symbol *${++symbolReferenceCount}>`)} *${symbolReferenceCount}]`
							keyName = `[<symbol *${symbolReferenceCount}>]`
						}
					} else
						keyString = keyName = formatName(key)

					if ("value" in descriptor) {
						o += `${prefix}${keyString}: `

						stringify(descriptor.value, `${valueName}${valueName && valueName != `.` && keyName[0] == `[` ? `` : `.`}${keyName}`)
					} else {
						if (descriptor.get != undefined) {
							o += `${prefix}get ${keyString}: `
							stringify(descriptor.get, `${valueName}.<get ${keyName}>`)
						}

						if (descriptor.set != undefined) {
							o += `${prefix}set ${keyString}: `
							stringify(descriptor.set, `${valueName}.<set ${keyName}>`)
						}
					}
				}

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
					o += `\n${indent()}<stack>: ${JSON.stringify(stack)}`

				if (arrayBufferByteLength != undefined) {
					o += `\n${indent()}<byteLength>: ${arrayBufferByteLength}\n${indent()}<content>: <${
						[ ...new Uint8Array(value as any) ].map(byte => byte.toString(16).toUpperCase().padStart(2, `0`)).join(` `)
					}>`
				}

				if (typedArrayAttributes) {
					o += `\n${indent()}<buffer>: `
					stringify(typedArrayAttributes.buffer, `${valueName}.<buffer>`)
					o += `\n${indent()}<byteLength>: ${typedArrayAttributes.byteLength}\n${indent()}<byteOffset>: ${typedArrayAttributes.byteOffset}\n${indent()}<length>: ${typedArrayAttributes.length}`
				}

				const prototype = Object.getPrototypeOf(value)

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
					: Object.prototype

				if (prototype != expectedPrototype) {
					o += `\n${indent()}<prototype>: `
					stringify(prototype, `${valueName}.<prototype>`)
				}

				indentLevel--

				if (keys.length || mapEntries?.length || prototype != expectedPrototype || stack != undefined || setValues?.length || arrayBufferByteLength != undefined || typedArrayAttributes)
					o += `\n${indent()}`

				o += isArray ? `]` : `}`
			}
		} else
			o += String(value)
	}
}

export function getDebugNames(values: Record<string, unknown>, names = new Map<unknown, string>): Map<unknown, string> {
	const queue: { name: string, value: unknown }[] = Object.entries(values).map(([ name, value ]) => ({ name, value }))

	for (const item of queue) {
		if (names.has(item.value))
			continue

		if (typeof item.value == `symbol`)
			names.set(item.value, item.name)
		else if (typeof item.value == `function` || (item.value && typeof item.value == `object`)) {
			names.set(item.value, item.name)

			const descriptorEntries = Object.entries(Object.getOwnPropertyDescriptors(item.value))

			for (const [ name, descriptor ] of descriptorEntries) {
				if ("value" in descriptor)
					queue.push({ name: `${item.name}.${formatName(name)}`, value: descriptor.value })
				else {
					queue.push(
						{ name: `${item.name}.<get ${formatName(name)}>`, value: descriptor.get },
						{ name: `${item.name}.<set ${formatName(name)}>`, value: descriptor.set }
					)
				}
			}

			queue.push({ name: `${item.name}.<prototype>`, value: Object.getPrototypeOf(item.value) })
		}
	}

	return names
}

if (import.meta.vitest) {
	const { test, expect } = import.meta.vitest

	test(`undefined`, () => {
		expect(toDebugString(undefined)).toBe(`undefined`)
	})

	test(`null`, () => {
		expect(toDebugString(null)).toBe(`null`)
	})

	test(`boolean`, () => {
		expect(toDebugString(true)).toBe(`true`)
		expect(toDebugString(false)).toBe(`false`)
	})

	test(`number`, () => {
		expect(toDebugString(1)).toBe(`1`)
	})

	test(`bigint`, () => {
		expect(toDebugString(1n)).toBe(`1n`)
	})

	test(`string`, () => {
		expect(toDebugString(`foo`)).toBe(`"foo"`)
	})

	test(`symbol`, () => {
		expect(toDebugString(Symbol())).toBe(`Symbol()`)
		expect(toDebugString(Symbol(`foo`))).toBe(`Symbol("foo")`)
	})

	test(`symbol registry`, () => {
		expect(toDebugString(Symbol.for(`foo`))).toBe(`Symbol.for("foo")`)
	})

	test(`well-known symbol`, () => {
		expect(toDebugString(Symbol.iterator)).toBe(`Symbol.iterator`)
	})

	test(`object`, () => {
		expect(toDebugString({ foo: `bar` })).toMatchInlineSnapshot(`
			"{
				foo: "bar"
			}"
		`)
	})

	test(`generator object`, () => {
		expect(toDebugString((function* () {})())).toMatchInlineSnapshot(`
			"{
				<prototype>: {
					<prototype>: <GeneratorPrototype>
				}
			}"
		`)
	})

	test(`symbol key`, () => {
		expect(toDebugString({ [Symbol.toStringTag]: `Foo` })).toMatchInlineSnapshot(`
			"{
				[Symbol.toStringTag]: "Foo"
			}"
		`)
	})

	test(`symbol as key and value`, () => {
		const symbol = Symbol(`foo`)

		expect(toDebugString({ [symbol]: symbol })).toMatchInlineSnapshot(`
			"{
				[Symbol("foo") *1]: <symbol *1>
			}"
		`)
	})

	test(`symbol used as key twice`, () => {
		const symbol = Symbol(`foo`)

		expect(toDebugString({ a: { [symbol]: symbol }, b: { [symbol]: symbol } })).toMatchInlineSnapshot(`
			"{
				a: {
					[Symbol("foo") *1]: <symbol *1>
				}
				b: {
					[<symbol *1>]: <symbol *1>
				}
			}"
		`)
	})

	test(`symbol getter`, () => {
		expect(toDebugString({
			get [Symbol.toStringTag]() {
				return `Foo`
			}
		})).toMatchInlineSnapshot(`
			"{
				get [Symbol.toStringTag]: function "get [Symbol.toStringTag]"(0) {}
			}"
		`)
	})

	test(`unextensible`, () => {
		expect(toDebugString(Object.preventExtensions({
			foo: `bar`
		}))).toMatchInlineSnapshot(`
			"unextensible {
				foo: "bar"
			}"
		`)
	})

	test(`sealed`, () => {
		expect(toDebugString(Object.seal({
			foo: `bar`
		}))).toMatchInlineSnapshot(`
			"sealed {
				foo: "bar"
			}"
		`)
	})

	test(`frozen`, () => {
		expect(toDebugString(Object.freeze({
			foo: `bar`
		}))).toMatchInlineSnapshot(`
			"frozen {
				foo: "bar"
			}"
		`)
	})

	test(`only readonly`, () => {
		expect(toDebugString(Object.defineProperties({}, {
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
		expect(toDebugString({})).toMatchInlineSnapshot(`"{}"`)
	})

	test(`arrow function`, () => {
		expect(toDebugString(() => {})).toMatchInlineSnapshot(`"function ""(0) {}"`)
	})

	test(`function expression`, () => {
		expect(toDebugString(function () {})).toMatchInlineSnapshot(`
			"function ""(0) {
				unconfigurable unenumerable prototype: {
					unenumerable constructor: .
				}
			}"
		`)
	})

	test(`generator function`, () => {
		expect(toDebugString(function* () {})).toMatchInlineSnapshot(`
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

		expect(toDebugString({ generatorFunction, generatorObject: generatorFunction() })).toMatchInlineSnapshot(`
			"{
				generatorFunction: function generatorFunction(0) {
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
		expect(toDebugString(/ab+c/g)).toMatchInlineSnapshot(`
			"/ab+c/g {
				unconfigurable unenumerable lastIndex: 0
				<prototype>: RegExp.prototype
			}"
		`)
	})

	test(`fake regex`, () => {
		expect(toDebugString(Object.defineProperties(Object.create(RegExp.prototype), {
			lastIndex: { value: 0, writable: true }
		}))).toMatchInlineSnapshot(`
			"{
				unconfigurable unenumerable lastIndex: 0
				<prototype>: RegExp.prototype
			}"
		`)
	})

	test(`map`, () => {
		expect(toDebugString(new Map([ [ "foo", "bar" ] ]))).toMatchInlineSnapshot(`
			"Map {
				<entry 0 key>: "foo"
				<entry 0 value>: "bar"
			}"
		`)
	})

	test(`prototypeless map`, () => {
		expect(toDebugString(Object.setPrototypeOf(new Map([ [ "foo", "bar" ] ]), null))).toMatchInlineSnapshot(`
			"Map {
				<entry 0 key>: "foo"
				<entry 0 value>: "bar"
				<prototype>: null
			}"
		`)
	})

	test(`set`, () => {
		expect(toDebugString(new Set([ `foo`, `bar`, `baz` ]))).toMatchInlineSnapshot(`
			"Set {
				<entry 0>: "foo"
				<entry 1>: "bar"
				<entry 2>: "baz"
			}"
		`)
	})

	test(`array buffer`, () => {
		expect(toDebugString(new Uint8Array([ 1, 2, 3 ]).buffer)).toMatchInlineSnapshot(`
			"ArrayBuffer {
				<byteLength>: 3
				<content>: <01 02 03>
			}"
		`)
	})

	test(`byte array`, () => {
		expect(toDebugString(new Uint8Array([ 1, 2, 3 ]))).toMatchInlineSnapshot(`
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
		expect(toDebugString({ [Symbol.for(`foo`)]: 0 })).toMatchInlineSnapshot(`
			"{
				[Symbol.for("foo")]: 0
			}"
		`)
	})

	test(`symbol key to symbol key to symbol key`, () => {
		const a = Symbol(`a`)
		const b = Symbol(`b`)
		const c = Symbol(`c`)

		expect(toDebugString({
			[a]: b,
			[b]: c,
			[c]: a
		})).toMatchInlineSnapshot(`
			"{
				[Symbol("a") *1]: Symbol("b")
				[.[<symbol *1>]]: Symbol("c")
				[.[.[<symbol *1>]]]: <symbol *1>
			}"
		`)
	})

	test(`nested symbol key to symbol key to symbol key`, () => {
		const a = Symbol(`a`)
		const b = Symbol(`b`)
		const c = Symbol(`c`)

		expect(toDebugString({
			foo: {
				[a]: b,
				[b]: c,
				[c]: a
			}
		})).toMatchInlineSnapshot(`
			"{
				foo: {
					[Symbol("a") *1]: Symbol("b")
					[.foo[<symbol *1>]]: Symbol("c")
					[.foo[.foo[<symbol *1>]]]: <symbol *1>
				}
			}"
		`)
	})

	test(`object nested in symbol keys`, () => {
		const foo = {}

		expect(toDebugString({
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
		expect(toDebugString([ 1, 2, 3 ])).toMatchInlineSnapshot(`
			"[
				0: 1
				1: 2
				2: 3
				unconfigurable unenumerable length: 3
			]"
		`)
	})

	test(`function with overriden name and length`, () => {
		expect(toDebugString(Object.defineProperties(() => {}, {
			name: { get: () => {} },
			length: { get: () => {} }
		}))).toMatchInlineSnapshot(`
			"function {
				unenumerable get length: function get(0) {}
				unenumerable get name: function get(0) {}
			}"
		`)
	})
}
