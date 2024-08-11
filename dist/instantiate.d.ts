import { type RollupWasmPromise } from "./_private/instantiate-wasm.js";
import { InstantiatedWasi } from "./instantiated-wasi.js";
import { EntirePublicInterface } from "./types.js";
/**
 * Instantiates a WASM module with the specified WASI imports.
 *
 * `input` can be any one of:
 *
 * * `Response` or `Promise<Response>` (from e.g. `fetch`). Uses `WebAssembly.instantiateStreaming`.
 * * `ArrayBuffer` representing the WASM in binary form, or a `WebAssembly.Module`.
 * * A function that takes 1 argument of type `WebAssembly.Imports` and returns a `WebAssembly.WebAssemblyInstantiatedSource`. This is the type that `@rollup/plugin-wasm` returns when bundling a pre-built WASM binary.
 *
 * @param wasmFetchPromise
 * @param unboundImports
 */
export declare function instantiate<E extends {}>(wasmFetchPromise: Response | PromiseLike<Response>, unboundImports: EntirePublicInterface): Promise<InstantiatedWasi<E>>;
export declare function instantiate<E extends {}>(moduleBytes: WebAssembly.Module | BufferSource, unboundImports: EntirePublicInterface): Promise<InstantiatedWasi<E>>;
export declare function instantiate<E extends {}>(wasmInstantiator: RollupWasmPromise, unboundImports: EntirePublicInterface): Promise<InstantiatedWasi<E>>;
//# sourceMappingURL=instantiate.d.ts.map