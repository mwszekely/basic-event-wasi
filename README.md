
# Basic Event-Based WASI

This is an *extremely* limited implementation of [WASI preview1](https://github.com/WebAssembly/WASI/blob/main/legacy/preview1/docs.md), meant to be just enough to get basic code to link, and where appropriate attempt to use native browser APIs (e.g. mapping `fd_write` to `console.log` when appropriate). Some extras like Emscripten's `env.__throw_exception_with_stack_trace` and `env.emscripten_notify_memory_growth` are included as well.

Most functions are dispatched as an `Event` on `globalThis`, and have default behavior if unhandled. For example, `fd_write` (called by `printf` and such) will default to `console.log` (if `stdout` was specified to be written to).  If you'd like to prevent this behavior to do something different, call `preventDefault` on the event.

In the table below, "default behavior" refers to what happens if `e.preventDefault()` is not called.

|Function|Implementation|Default behavior|
|--------|--------------|----------------|
|`proc_exit`|Event|Not cancellable, throws `AbortError`|
|`fd_write`|Event|Write to console as stdout or stderr, or returns `badfile` for other descriptors|
|`fd_read`|Event|Reads `window.prompt` as stdin, or returns `badfile` for other descriptors|
|`fd_close`|Event|Nothing|
|`fd_seek`|Event|No-op for stdin, stdout, stderr, returns `badfile` for other descriptors|
|`environ_get`|No-op|Returns `nullptr`|
|`environ_sizes_get`|No-op|Returns 0|
|`__throw_exception_with_stack_trace`|Event|Nothing|
|`emscripten_notify_memory_growth`|Event|Nothing|

Note that in `Worklet`s and some other contexts don't have access to `dispatchEvent`. In these cases, you can provide your own `dispatchEvent`, and the default will log a warning to the console.

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
const { promise: wasmReady, resolve: resolveWasm } = Promise.withResolvers<WebAssemblyInstantiatedSource>();
const { imports, wasiReady } = instantiateWasi(wasmReady, { fd_write, proc_exit });
resolveWasm(await WebAssembly.instantiateStreaming(source, imports));
await wasiReady;
// (The reason it's a bit more complicated is because WASM and WASI depend on each other circularly --
// WASM needs to have the WASI imports at compile-time,
// but WASI needs a reference to the WASM `Memory` object and such so it knows how to do its job)
```



## Why?

Just to see what it takes to load a bare-bones .wasm file.
