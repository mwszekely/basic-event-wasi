
# Basic Event-Based WASI

This is an *extremely* limited implementation of [WASI preview1](https://github.com/WebAssembly/WASI/blob/main/legacy/preview1/docs.md), meant to be just enough to get basic code to link, and where appropriate attempt to use native browser APIs (e.g. mapping stdout to `console.log`). Some extras like Emscripten's `env.__throw_exception_with_stack_trace` and `env.emscripten_notify_memory_growth` are included as well.

Most functions are dispatched as an `Event` on `globalThis`, and have default behavior if unhandled. For example, `fd_write` (called by `printf` and such) will default to `console.log` (if `stdout` was specified to be written to).  If you'd like to prevent this behavior to do something different, call `preventDefault` on the event.

## Implemented interfaces

### Events

Events are dispatched on `globalThis` and have default behavior if `preventDefault()` is not called on one.

Note that in `Worklet`s and some other contexts don't have access to `dispatchEvent`. In these cases, you can provide your own `dispatchEvent`, and the default will log a warning to the console about an unhandled event (a phrase beloved by all).

|Function|Behavior if `e.preventDefault()` is not called|
|--------|----------------|
|`proc_exit`|Throws `AbortError` (not cancellable with `preventDefault`)|
|`fd_write`|<ul><li>stdout: calls `console.log`</li><li>stderr: calls `console.error`</li><li>anything else: returns `badfile`</li></ul>|
|`fd_read`|<ul><li>stdin: calls `window.prompt`</li><li>anything else: returns `badfile`</li></ul>|
|`fd_close`|No-op|
|`fd_seek`|No-op for stdin, stdout, stderr, returns `badfile` for other descriptors|
|`__throw_exception_with_stack_trace`|No-op|
|`emscripten_notify_memory_growth`|No-op|

### Others

These functions are not events and their behavior cannot be adjusted at this time.

|Function|Behavior|
|--------|--------|
|`environ_get`|Returns `nullptr`|
|`environ_sizes_get`|Returns 0|

## Utility Functions

These are not directly related to WASI, but are too necessary to leave out, so they're provided as general-use exports for any consumer:

|Function|Behavior|
|--------|--------|
|`[read/write][Int/Uint][8/16/32/Pointer]` (e.g. `readUint32`)|Does whatever it says on the tin, writing or reading a byte/word in little-endian.|
|`getMemory`|Returns a current `DataView` of the instance's memory (even if it's grown)|
|`copyToWasm`|Copies `ArrayBuffer` data from JS memory to WASM memory.|
|`getPointerSize`|Returns 4. May eventually return 8. Never returns 2, among most other numbers.|
|`getInstanceExports`|Returns a typed version of `instance.exports`. You can use declaration merging to add things to `KnownInstanceExports` yourself.|

### Basic array management: `NativeArray`

Many (e.g.) C++ functions take a pointer to some data. Since a pointer to a JS `ArrayBuffer` can't exist, some boilerplate memory management is necessary.

As a utility class, `Native[Int/Uint][8/16/32]Array` also exists (e.g. `NativeUint8ClampedArray`). Its ideal use is passing byte data from JS to WASM &mdash; resizing a `NativeArray` allocates/frees the necessary space, into which you can assign data from a local JS `ArrayBuffer` (like from `ImageData` or similar).

It is not intended to handle more complex use cases, such as `std::vector<std::string>`, especially as things like `std::string` don't satisfy `is_trivially_copyable` and thus can't be copied around byte-by-byte as described. 

## To use:

This assumes you used `Emscripten` to compile some source to a `.wasm` file ***and not*** to a `.js`+`.wasm` combo, because `Emscripten`'s `.js` code takes care of all of this for you already and is far more complete than this library is.

Assuming you've compiled straight to a `.wasm` file (e.g. `-o module.wasm`):

```typescript
// Import whatever functions you want.
// Fully tree-shakable and dead-code-eliminate-able and such.
// (some of these talk to each other through shared global state, which `instantiateWasi` below takes care of for you)
import { fd_write, proc_exit } from "basic-event-wasi"

const source = fetch("./module.wasm");

// Simplest: Compile WASM and WASI from the same streaming source.
await instantiateStreamingWithWasi(source, { wasi_snapshot_preview1: { fd_write, proc_exit } });


// But if you need to handle the WebAssembly.instantiateStreaming step yourself? Sure:
const { promise: wasmReady, resolve: resolveWasm } = Promise.withResolvers();
const { imports, wasiReady } = instantiateWasi(wasmReady, { fd_write, proc_exit });
resolveWasm(await WebAssembly.instantiateStreaming(source, imports));
await wasiReady;
// (The reason it's a bit more complicated is because WASM and WASI depend on each other circularly --
// WASM needs to have the WASI imports at compile-time,
// but WASI needs a reference to the WASM `Memory` object and such so it knows how to do its job)
```



## Why?

Just to see what it takes to load a bare-bones .wasm file.

And despite very minimal completion status, a lot of code (especially library-esque code) can link just fine.
