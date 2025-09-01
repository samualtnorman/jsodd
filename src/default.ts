import { t } from "try"

const regExpSourceGetter = Object.getOwnPropertyDescriptor(RegExp.prototype, "source")!.get!
const regExpFlagsGetter = Object.getOwnPropertyDescriptor(RegExp.prototype, "flags")!.get!
const errorStackGetter = Object.getOwnPropertyDescriptor(Error(), `stack`)?.get || Object.getOwnPropertyDescriptor(Error.prototype, `stack`)?.get

const getRegExpSource = (regex: unknown): string => regExpSourceGetter.call(regex)
const getRegExpFlags = (regex: unknown): string => regExpFlagsGetter.call(regex)
const getErrorStack = (error: unknown): string | undefined => errorStackGetter?.call(error)

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

const TypedArray = Object.getPrototypeOf(Uint8Array)
const GeneratorFunction = (function* () {}).constructor
const GeneratorPrototype = GeneratorFunction.prototype.prototype
const AsyncFunction = (async () => {}).constructor
const AsyncGenerator = Object.getPrototypeOf((async function* () {}).prototype).constructor

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

	ArrayBuffer,
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

					if (descriptors.name && !descriptors.name.writable && !descriptors.name.enumerable && descriptors.name.configurable) {
						o += formatName(descriptors.name.value)
						delete descriptors.name
					}

					if (descriptors.length && !descriptors.length.writable && !descriptors.length.enumerable && descriptors.length.configurable) {
						o += `(${descriptors.length.value}) `
						delete descriptors.length
					}
				}

				const [ isRegex,, regexSource ] = t(() => `/${getRegExpSource(value)}/${getRegExpFlags(value)} `)

				if (isRegex)
					o += regexSource

				const [ isMap,, mapEntries ] = t(() => Map.prototype.entries.call(value).map(([ key, value ], index) => [ index, key, value ]).toArray())

				if (isMap)
					o += `Map `

				const [ ,, stack ] = t(() => getErrorStack(value))

				if (stack != undefined)
					o += `Error `

				o += Array.isArray(value) ? `[` : `{`

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

					const keyString = typeof key == `symbol` ? `[${names.has(key) ? names.get(key)! : `${symbolToDebugString(key, names, `symbol *${++symbolReferenceCount}`)} *${symbolReferenceCount}`}]` : formatName(key)

					if ("value" in descriptor) {
						o += `${prefix}${keyString}: `

						stringify(descriptor.value, `${valueName}.${keyString}`)
					} else {
						if (descriptor.get != undefined) {
							o += `${prefix}get ${keyString}: `
							stringify(descriptor.get, `${valueName}.<get ${keyString}>`)
						}

						if (descriptor.set != undefined) {
							o += `${prefix}set ${keyString}: `
							stringify(descriptor.set, `${valueName}.<set ${keyString}>`)
						}
					}
				}

				if (isMap) {
					for (const [ index, key, value ] of mapEntries) {
						o += `\n${indent()}<entry ${index} key>: `
						stringify(key, `${valueName}.<entry ${index} key>`)
						o += `\n${indent()}<entry ${index} value>: `
						stringify(value, `${valueName}.<entry ${index} value>`)
					}
				}

				if (stack != undefined)
					o += `\n${indent()}<stack>: ${JSON.stringify(stack)}`

				const prototype = Object.getPrototypeOf(value)

				const expectedPrototype =
					isMap ?
						Map.prototype
					: typeof value == `function` ?
						Function.prototype
					: Array.isArray(value) ?
						Array.prototype
					: Object.prototype


				if (prototype != expectedPrototype) {
					o += `\n${indent()}<prototype>: `
					stringify(prototype, `${valueName}.<prototype>`)
				}

				indentLevel--

				if (keys.length || mapEntries?.length || prototype != expectedPrototype)
					o += `\n${indent()}`

				o += `${Array.isArray(value) ? `]` : `}`}`
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
				[Symbol("foo") *1]: symbol *1
			}"
		`)
	})

	test(`symbol used as key twice`, () => {
		const symbol = Symbol(`foo`)

		expect(toDebugString({ a: { [symbol]: symbol }, b: { [symbol]: symbol } })).toMatchInlineSnapshot(`
			"{
				a: {
					[Symbol("foo") *1]: symbol *1
				}
				b: {
					[symbol *1]: symbol *1
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

	test(`error`, () => {
		expect(toDebugString(Error(`foo`))).toMatchInlineSnapshot(`
			"Error {
				unenumerable get stack: function ""(0) {}
				unenumerable set stack: function ""(1) {}
				unenumerable message: "foo"
				<stack>: "Error: foo\\n    at /home/samual/Git/samual/jsodd/src/default.ts:511:24\\n    at file:///home/samual/Git/samual/jsodd/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:155:11\\n    at file:///home/samual/Git/samual/jsodd/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:752:26\\n    at file:///home/samual/Git/samual/jsodd/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:1897:20\\n    at new Promise (<anonymous>)\\n    at runWithTimeout (file:///home/samual/Git/samual/jsodd/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:1863:10)\\n    at runTest (file:///home/samual/Git/samual/jsodd/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:1574:12)\\n    at processTicksAndRejections (node:internal/process/task_queues:105:5)\\n    at runSuite (file:///home/samual/Git/samual/jsodd/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:1729:8)\\n    at runFiles (file:///home/samual/Git/samual/jsodd/node_modules/.pnpm/@vitest+runner@3.2.4/node_modules/@vitest/runner/dist/chunk-hooks.js:1787:3)"
				<prototype>: Error.prototype
			}"
		`)
	})
}
