import type { EntirePublicEnvInterface, EntirePublicInterface, EntirePublicWasiInterface } from "./types.js";
/**
 * Like `WebAssembly.instantiateStreaming`, but also instantiates WASI with the `imports` you pass in.
 *
 * This is a very basic wrapper around `instantiateWasi` and `WebAssembly.compileStreaming` that you can easily re-implement if you need to fine-tune the behavior in some way.
 *
 * @param wasm
 * @param imports2
 * @returns
 */
export declare function instantiateStreamingWithWasi<K extends keyof EntirePublicWasiInterface, L extends keyof EntirePublicEnvInterface>(wasm: Response | Promise<Response>, imports2: EntirePublicInterface<K, L>): Promise<WebAssembly.WebAssemblyInstantiatedSource>;
