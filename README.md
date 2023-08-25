
# Basic Event-Based WASI

This is an *extremely* limited implementation of [WASI preview1](https://github.com/WebAssembly/WASI/blob/main/legacy/preview1/docs.md), meant to be just enough to get basic code to link, and where appropriate attempt to use native browser APIs (e.g. mapping `fd_write` to `console.log` when appropriate).

Most functions are dispatched as an `Event` on `globalThis`, and have default behavior if unhandled. For example, `fd_write` (called by `printf` and such) will default to `console.log` (if `stdout` was specified to be written to).  If you'd like to prevent this behavior to do something different, call `preventDefault` on the event.

In the table below, "default behavior" refers to what happens if `e.preventDefault()` is not called.

|Function|Implementation|Default behavior|
|--------|--------------|----------------|
|`proc_exit`|Event|Not cancellable, throws `AbortError`|
|`fd_write`|Event|Write to console as stdout or stderr, or returns `badfile` for other descriptors|
|`fd_read`|Event|Reads `window.prompt` as stdin, or returns `badfile` for other descriptors|
|`fd_close`|Event|Nothing|
|`fd_seek`|Event|No-op for stdin, stdout, stderr, returns `badfile` for other descriptors|
|`environ_get`|No-op|Nothing|
|`environ_sizes_get`|No-op|Nothing|

## To use:

This assumes you used `Emscripten` to compile some source to a `.wasm` file ***and not*** to a `.js`+`.wasm` combo, because `Emscripten`'s `.js` code takes care of all of this for you already.

Assuming you've compiled straight to a `.wasm` file (i.e. implying `-sSTANDALONE_WASM=1`):

```typescript
// Import whatever functions you want.
// Fully tree-shakable and dead-code-eliminate-able and such.
// (some of these talk to each other through shared global state, which `instantiateWasi` below takes care of for you)
import { fd_write, proc_exit } from "basic-event-wasi" 

// WASI needs to know when WASM is ready, and WASM needs to know when WASI is ready,
// so there's a little bit of juggling promises around:
// The wasmReady promise resolves once the WASM has loaded
// WASI needs it because it needs access to its memory array and other things.
const { promise: wasmReady, resolve: resolveWasm } = Promise.withResolvers<WebAssemblyInstantiatedSource>();

// The wasiReady promise resolves immediately after the wasmReady promise resolves,
// but it runs some initialization code so it's import to wait for it too.
const { imports, wasiReady } = instantiateWasi(wasmReady.then(s => s.instance), { fd_write, proc_exit });
await WebAssembly.instantiateStreaming(source, { ...imports }); // (Mix in other imports if you got 'em too)
resolveWasm();
await wasiReady;
// Now anything that relies on WASI can be called

```