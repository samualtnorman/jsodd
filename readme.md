# JavaScript Object Descriptor Definition (JSODD)
Capture JavaScript values as a string in excruciating detail.

## Examples
### Print a plain old JavaScript object
```js
console.log(toJsodd({ foo: "bar" }))
```

```jsodd
{
	foo: "bar"
}
```

### Print thrown values
```js
console.log(toJsodd(new Error("foo")))
```

```jsodd
Error {
	unenumerable get stack: <V8ErrorStackGetter>
	unenumerable set stack: <V8ErrorStackSetter>
	unenumerable message: "foo"
	<stack>:
		"Error: foo\n"
		"    at file:///home/samual/Git/samual/jsodd/src/default.ts:1292:21\n"
		"    at ModuleJob.run (node:internal/modules/esm/module_job:413:25)\n"
		"    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:660:26)\n"
		"    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5)"
}
```

### See what builtins look like
```js
console.log(toJsodd(Promise, { friendlyNames: mapFriendlyNames({ Symbol }) }))
```

```jsodd
function Promise(1) {
	unconfigurable unenumerable readonly prototype: {
		unenumerable constructor: .
		unenumerable then(2) {}
		unenumerable catch(1) {}
		unenumerable finally(1) {}
		unenumerable readonly [Symbol.toStringTag]: "Promise"
	}
	unenumerable all(1) {}
	unenumerable allSettled(1) {}
	unenumerable any(1) {}
	unenumerable race(1) {}
	unenumerable resolve(1) {}
	unenumerable reject(1) {}
	unenumerable withResolvers(0) {}
	unenumerable try(1) {}
	unenumerable get [Symbol.species](0) {}
}
```
