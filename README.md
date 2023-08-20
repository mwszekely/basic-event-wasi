
# Basic Event-Based WASI

This is an *extremely* limited implementation of [WASI preview1](https://github.com/WebAssembly/WASI/blob/main/legacy/preview1/docs.md), meant to be just enough to get basic code to compile.

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
// (some of these talk to each other through shared global state, which `makeWasiInterface` below takes care of for you)
import { fd_write, proc_exit } from "basic-event-wasi" 

const { promise: wasmReady, resolve } = Promise.withResolvers<WebAssemblyInstantiatedSource>(); // https://github.com/tc39/proposal-promise-with-resolvers
const { imports, wasiReady } = makeWasiInterface(wasmReady.then(s => s.instance), { fd_write, proc_exit });

await WebAssembly.instantiateStreaming(source, { ...imports }); // Mix in other imports if you got 'em too
resolve();
await wasiReady;
// Now anything that relies on WASI can be called
```