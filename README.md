# Basic Event-Based WASI for the Browser

This is an *extremely* limited implementation of [WASI preview1](https://github.com/WebAssembly/WASI/blob/main/legacy/preview1/docs.md) and [Embind](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/embind.html), meant to be just enough to get basic code to link, and where appropriate attempt to use native browser APIs (e.g. mapping stdout to `console.log`).

Most functions are dispatched as an `Event` and have default behavior if unhandled. For example, `fd_write` (called by `printf` and such) will default to `console.log` or `console.error` as appropriate.  If you'd like to prevent this behavior to do something different, call `preventDefault` on the event.

Note that Embind only has minimal support, and generally speaking this library won't support any of Emscripten's or Embind's fancier features. **Unless you have a good reason to not use Emscripten's default output, you should probably just stick with that instead of using this library.** This is mostly just for fun.

### Goals

* Allow simple, self-contained C/C++ libraries to "link" to the web more easily
* Allow using Emscripten to compile to a "raw" WASM file, with an alternative to Emscripten's usual glue code

### Non-goals

* Supporting full applications, e.g. games, tools, IDEs, etc.
* Supporting non-standard WASM features/Emscripten extensions
* Highly optimized, pre-transformed glue code (what Emscripten offers by default)
* Compatibility with older browsers outside of standard [Babel](https://babeljs.io/) transformations or [`core-js`](https://github.com/zloirock/core-js) usage.

### Probably not ever happening but is theoretically within scope
* Linking audio code to `AudioContext`s or OpenGL code to a document's `<canvas>`
* Complete Embind support

In general (and this is emphasized throughout this Readme), consider using Emscripten's full output itself instead of this library. Emscripten has been thoroughly optimized and battle-tested over the years, whereas this library is largely just a toy.


## How to use

```typescript
import { InstantiatedWasm, type KnownImports } from "basic-event-wasi/wasm.js";

// Pick and choose the WASI functions your compiled code needs
// (There's no way to automate this--use Emscripten in full for that.
// But the benefit is this is tree-shakeable by any bundler under the sun)
import { fd_read } from "basic-event-wasi/wasi_snapshot_preview1/fd_read.js";
import { fd_write } from "basic-event-wasi/wasi_snapshot_preview1/fd_write.js";
// (...etc...)

const imports: KnownImports = {
    wasi_snapshot_preview1: {
        fd_close,
        fd_read,
        fd_seek,
        fd_write,
        environ_get,
        environ_sizes_get,
        proc_exit,
    },
    env: {
        __throw_exception_with_stack_trace,
        emscripten_notify_memory_growth,
        _embind_register_void,
        _embind_register_bool,
        // (...etc...)
    }
}

const wasm = await InstantiatedWasm.instantiate(fetch("program.wasm"), imports);

// `wasm` has the same interface as `WebAssembly.WebAssemblyInstantiatedSource`
wasm.instance.exports.memory.buffer;
wasm.module;

// Additionally, `embind` contains everything that was embound: 
wasm.embind.someMangledCPlusPlusFunction("that takes a string");

```

Additionally, certain `emcc` flags either must or must not be used. This is an inexhaustive list:
|Flag|Use|
|----|---|
|`-o`|Must be a `.wasm` file, not a `.js` file.|
|`-fwasm-exceptions`|Supported. See below for examples.|
|`-sALLOW_MEMORY_GROWTH`|Supported&mdash;`cachedMemoryView` is refreshed whenever more memory is allocated. *Note that `-sPURE_WASI` disables this refresh behavior.*|
|`-sWASM_BIGINT`|Recommended generally; required if using 64-bit ints.|
|`-sSTANDALONE_WASM`|Recommended, though no difference has been observed yet|
|`-sPURE_WASI`|Incompatible with `-sALLOW_MEMORY_GROWTH`, as currently this flag's only purpose in Emscripten's stdlib is to disable the memory growth callback, which is not standardized in WASI.|
|`-sSAFE_HEAP=1`|Supported|
|`-sASSERTIONS=1`|Supported|
|`-sDYNCALLS`|Not supported|
|`-sASYNCIFY`|Not supported|
|`-sRELOCATABLE`|Not supported (by extension, `MAIN_MODULE` and `SIDE_MODULE` are also not supported)|
|`-sMEMORY64`|Not (currently) supported|
|`-fexceptions`|Not supported. Use `-fwasm-exceptions` instead.|
|`-lembind`|Must be specified if using Embind (which is probably obvious but it's here just in case)|
|`--emit-tsd`|Sadly this is mutually exclusive with `-o *.wasm` and cannot be used (at least in the same build step)|

In general, anything outside of very standard, plain WebAssembly-as-specified won't work, and there is little support for polyfilling old browsers. For that, the usual use of Emscripten is **highly** recommended.

## API

### `InstantiatedWasm`

This is effectively `WebAssembly.WebAssemblyInstantiatedSource` attached to an `EventTarget`. Additionally, in Typescript its exports are strongly typed.

* `instance` returns the `WebAssembly.Instance` currently in-use
* `module` returns the `WebAssembly.Module` the instance is based off
* `embind` contains every export from `EMSCRIPTEN_BINDINGS`. Functions here are callable with normal JS types that will be converted back-and-forth to their WASM representations.
* `exports` contains all the *raw* exports from your WASM module. The functions here won't marshall between (e.g.) strings and numbers for you; if you're using the `exports` field, it's expected you're doing that yourself.
* `cachedMemoryView` is a `DataView` representing the current memory; it auto-refreshes if the instance's memory grows. By always referencing this property, you can ensure you have a live view of memory even after memory growth events.

Being an `EventTarget`, things like `addEventListener` are there too, which you can use to listen for events to handle.

Note that you must construct this class via the `static` method `instantiate`, as the constructor is private. It works like `WebAssembly.instantiate` or `WebAssembly.instantiateStreaming` with the arguments you give it. The first is the source, one of:
* `Response`/`Promise<Response>`, like what you'd get from `fetch`. Uses `WebAssembly.instantiateStreaming`.
* `ArrayBuffer` of the raw data, if you've already got it (e.g. if you've inlined some base64). Uses `WebAssembly.instantiate`.
* `WebAssembly.Module`, if you want to create a new instance of an existing WASM instance. Uses `WebAssembly.instantiate`.
* For the most general use-cases, you can pass a function that's expected to call `WebAssembly.instantiate` (or something similar) with the given `imports` parameter. The other options above do this internally.

For the second `imports` parameter, you'll need to provide all the WASI (and related) functions that your WASM program requires. These can be found in the `/wasi_snapshot_preview1` and `/env` directories. You can see which ones you need by analyzing your WASM binary's text representation, using a tool like [wasm2wat](https://webassembly.github.io/wabt/demo/wasm2wat/). Or trial and error. (Or just use Emscripten's full output, which does this for you, etc.)

### Polyfills

Certain important interfaces like `CustomEvent` and `TextDecoder` are not available in extremely limited environments, like `Worklet`s. Because they are necessary for this library to function, minimal polyfills are provided that you can use in these cases.

```typescript
import "basic-event-wasi/polyfill/event.js";
import "basic-event-wasi/polyfill/custom-event.js";
import "basic-event-wasi/polyfill/text-encoder.js";
import "basic-event-wasi/polyfill/text-decoder.js";

import { instantiate } from "basic-event-wasi/instantiate.js"
// ...the rest of your Worklet's imports and code
```

### Implemented imports


#### WASI

If the function dispatches an event, the default behavior occurs if `e.preventDefault()` is not called. Otherwise, the default behavior always occurs.

|Function|Event?|Default behavior|
|--------|------|----------------|
|`proc_exit`|✔️|Throws `AbortError` (not cancellable with `preventDefault`, and in practice a `RuntimeError` is usually thrown first anyway)|
|`fd_write`|✔️|<ul><li>stdout: calls `console.log`</li><li>stderr: calls `console.error`</li><li>anything else: returns `badfile`</li></ul>|
|`fd_read`|✔️|<ul><li>stdin: calls `window.prompt`</li><li>anything else: returns `badfile`</li></ul>|
|`fd_close`|✔️|No-op|
|`fd_seek`|✔️|No-op for stdin, stdout, stderr, returns `badfile` for other descriptors|
|`clock_time_get`| |<ul><li>`REALTIME`: Returns `Date.now()`</li><li>`MONOTONIC`: Returns `performance.now()` if it exists, or `ENOSYS` in limited environments where it doesn't.</li><li>`PROCESS_CPUTIME_ID`: `ENOSYS`</li><li>`THREAD_CPUTIME_ID`: `ENOSYS`</li></ul>|
|`environ_get`| |Returns `nullptr`|
|`environ_sizes_get`| |Returns 0|
|`__throw_exception_with_stack_trace`| |Throws the `WebAssembly.Exception`. Like `Emscripten` by itself, this will have a `message` field of type `[type: string, message?: string]`.|
|`emscripten_notify_memory_growth`|✔️|Refreshes `cachedMemoryView`|

#### Env
|Function|Event?|Default behavior|
|--------|------|----------------|
|`segfault`| |Throws a `SegfaultError`. Used by `-sSAFE_HEAP`.|
|`alignfault`| |Throws an `AlignfaultError`. Used by `-sSAFE_HEAP`.|
|`_tzset_js`| |No-op (pulled in by `#include <iostream>`)|
|`embind_*`| |Adds values and functions to the `embind` object|


### Embindables

Embind support is limited to the following at present:

* Integers/floats/bools (including bigint as 64-bit integers) and `void`.
* `std::string` and `std::wstring`
* `struct`s
* `std::array` and C-style arrays of known length
* `enum`s, `enum struct`s
* Constants of any supported type
* Functions that accept or return any supported type
    * Overloaded functions must be given different names.
* Basic class support:
    * Constructors cannot be overloaded
    * Overloaded methods must be given different names
    * Things like having a C++ class derive from a JS class, having a virtual method call a JS function, and other inheritance shenanigans are not supported.
    * `[Symbol.dispose]` must be called on the instance when you're done with it (e.g. with a [`using` statement](https://github.com/tc39/proposal-explicit-resource-management))
    * While `FinalizationRegistry` is used, keep in mind that ***if*** the class's destructor is called in this way, it would be from memory pressure on the JS heap, not on the C++ heap. And keep in mind that WASM memory cannot shrink, so if your C++ heap is so large it's affecting the JS heap, it's going to stay that way until the page reloads. **Do not** rely on this behavior to clean up your pointers. It's honestly likely that this feature may simply be removed at some point for these reasons.
    * Classes support being passed/returned by value, pointer, and (l-value) reference. **Use caution when passing/returning by reference**:
        * When a C++ function returns something by reference, Embind treats that a a copy by default. Use `return_value_policy::reference()` to **actually** return a reference (and obviously make sure you don't return a reference to something on the stack).
        * Returning a `const` reference seems to be incompatible with `return_value_policy::reference()`, resulting in a compiler error, so you'll need to return a `const` pointer or a by-value copy instead

Notably not supported:
* Embind does not support pointers to non-class types (e.g. `int*`, `struct Foo*`, etc.). 
    * Functions or constants using these types must be `reinterpret_cast` to use `std::uintptr_t` instead of pointers.
    * Structs are out of luck, though. Use classes (or more specifically, `emscripten::class_`, it works on `struct`s too)
    * For arrays, use `inspectClassByPointer` to "inspect" the class at each element in the array. Don't call `Symbol.dispose` on an inspected class instance.
* Memory views (stubbed out)
* Emvals (stubbed out)
* Anything that depends on Emvals, like
    * `std::vector`
    * `std::map`
    * `std::optional`
    * Custom user types
* Smart pointers (`std::unique_ptr`, `std::shared_ptr`)

Note that trying to use Embind on a function that depends on an incompatible type will result in `instantiate` hanging infinitely, waiting for a type definition that will never come (a warning will be printed to the console in this case).

### Utility Functions

These are not directly related to WASI, but are too necessary to leave out, so they're provided as general-use exports for any consumer:

|Function|Behavior|
|--------|--------|
|`readInt8`,`writeInt8`<br>`readUint8`,`writeUint8`<br>`readInt16`,`writeInt16`<br>`readUint16`,`writeUint16`<br>`readUint32`,`writeUint32`<br>`readInt32`,`writeInt32`<br>`readInt64`,`writeInt64`<br>`readUint64`,`writeUint64`<br>`readPointer`,`writePointer`<br>`readSizeT`,`writeSizeT`|Does whatever it says on the tin, writing or reading a byte/word in little-endian at the address you provide. This address is interpreted as being **byte-aligned**, not word-aligned; this is in contrast to (e.g.) a `Uint32Array`, which is word-aligned.|
|`getPointerSize`<br>`getSizeTSize`|Returns 4. May eventually return 8. Never returns 2, among most other numbers.|
|`getMemory`|Returns a current `DataView` of the instance's memory (even if it's grown). Remember that `DataView`, by default, reads in big endian.|
|`copyToWasm`|Copies `ArrayBuffer` data from JS memory to WASM memory.|

Functions pairs like `readPointer`/`readSizeT`, `getPointerSize`/`getSizeTSize`, etc. are separated out because while in practice they are *almost always identical*, the C and C++ standards state that `uintptr_t` **may** be a different width than `size_t`. It's theoretically possible that, in the future, a 32-bit multi-memory WASM module would define pointers as 64-bit but `size_t` to be 32-bit, so the distinction is preserved here.

### Basic array management: `NativeArray`

Many (e.g.) C++ functions take a pointer to some data. Since a pointer to a JS `ArrayBuffer` can't exist, some boilerplate memory management is necessary.

As a utility class, `Native[Int/Uint][8/16/32]Array` also exists (e.g. `NativeUint8ClampedArray`). Its ideal use is passing byte data from JS to WASM &mdash; resizing a `NativeArray` allocates/frees the necessary space, into which you can assign data from a local JS `ArrayBuffer` (like from `ImageData` or similar).

It is not intended to handle more complex use cases, such as `std::vector<std::string>`, especially as things like `std::string` don't satisfy `is_trivially_copyable` and thus can't be copied around byte-by-byte as described.


## Exception Handling

Exceptions thrown by C++ code can be caught by JS code. The mechanism is exactly the same as Emscripten:

```typescript
try {
    wasm.embind.codeThatThrows();
}
catch (ex) {
    console.assert(ex instanceof WebAssembly.Exception);
    const [type, message] = (ex as EmscriptenException).message;
    // `type` is, e.g., "std::runtime_error" or "int". The type of whatever was thrown.
    // `message` is the `std::exception`'s `message` field, or an empty string for non-exceptions.
}
```


