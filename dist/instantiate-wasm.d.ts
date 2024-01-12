import type { EntirePublicEnvInterface, EntirePublicInterface, EntirePublicWasiInterface } from "./types.js";
/**
 * Like `WebAssembly.instantiateStreaming`, but also instantiates WASI with the `imports` you pass in.
 *
 * This exists just to remove simple boilerplate. You can easily re-implement if you need to fine-tune the behavior in some way.
 */
export declare function instantiateStreamingWithWasi<K extends keyof EntirePublicWasiInterface, L extends keyof EntirePublicEnvInterface>(response: Response | Promise<Response>, unboundImports: EntirePublicInterface<K, L>): Promise<WebAssembly.WebAssemblyInstantiatedSource>;
/**
 * Like `WebAssembly.instantiate`, but also instantiates WASI with the `imports` you pass in.
 *
 * This exists just to remove simple boilerplate. You can easily re-implement if you need to fine-tune the behavior in some way.
 */
export declare function instantiateWithWasi<K extends keyof EntirePublicWasiInterface, L extends keyof EntirePublicEnvInterface>(module: WebAssembly.Module | BufferSource, unboundImports: EntirePublicInterface<K, L>): Promise<WebAssembly.WebAssemblyInstantiatedSource>;
/**
 * Like `instantiateWithWasi`, but takes the function returned by @rollup/plugin-wasm when a .wasm file is `import`ed by Javascript.
 *
 * This exists just to remove simple boilerplate. You can easily re-implement if you need to fine-tune the behavior in some way.
 */
export declare function instantiateFromRollupWithWasi<K extends keyof EntirePublicWasiInterface, L extends keyof EntirePublicEnvInterface>(wasmFetchPromise: RollupWasmPromise, unboundImports: EntirePublicInterface<K, L>): Promise<WebAssembly.WebAssemblyInstantiatedSource>;
export type RollupWasmPromise = (imports?: WebAssembly.Imports) => Promise<WebAssembly.WebAssemblyInstantiatedSource>;
