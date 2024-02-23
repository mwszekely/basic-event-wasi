import { instantiateWasi } from "./instantiate-wasi.js";
import type { EntirePublicEnvInterface, EntirePublicInterface, EntirePublicWasiInterface } from "./types.js";

async function instantiateGeneric<K extends keyof EntirePublicWasiInterface, L extends keyof EntirePublicEnvInterface>(instantiateWasm: (boundImports: WebAssembly.Imports) => Promise<WebAssembly.WebAssemblyInstantiatedSource>, unboundImports: EntirePublicInterface<K, L>) {

    // There's a bit of song and dance to get around the fact that:
    // 1. WASM needs its WASI imports immediately upon instantiation.
    // 2. WASI needs its WASM Instance immediately upon instantiation.
    // So we use promises to notify each that the other's been created.

    const { promise: wasmReady, resolve: resolveWasm } = Promise.withResolvers<WebAssembly.WebAssemblyInstantiatedSource>();
    const { imports, wasiReady } = instantiateWasi<K, L>(wasmReady, unboundImports);
    debugger;
    const wasm = await instantiateWasm({ ...imports });
    debugger;
    resolveWasm(wasm);
    return await wasiReady;
}

/**
 * Like `WebAssembly.instantiateStreaming`, but also instantiates WASI with the `imports` you pass in.
 * 
 * This exists just to remove simple boilerplate. You can easily re-implement if you need to fine-tune the behavior in some way.
 */
export async function instantiateStreamingWithWasi<K extends keyof EntirePublicWasiInterface, L extends keyof EntirePublicEnvInterface>(response: Response | Promise<Response>, unboundImports: EntirePublicInterface<K, L>) {
    return await instantiateGeneric(async (combinedImports) => await  WebAssembly.instantiateStreaming(response, { ...combinedImports }), unboundImports);
}

/**
 * Like `WebAssembly.instantiate`, but also instantiates WASI with the `imports` you pass in.
 * 
 * This exists just to remove simple boilerplate. You can easily re-implement if you need to fine-tune the behavior in some way.
 */
export async function instantiateWithWasi<K extends keyof EntirePublicWasiInterface, L extends keyof EntirePublicEnvInterface>(module: WebAssembly.Module | BufferSource, unboundImports: EntirePublicInterface<K, L>) {
    return await instantiateGeneric(async (combinedImports) => ({ module, instance: await WebAssembly.instantiate(module, { ...combinedImports }) }), unboundImports);
}

/**
 * Like `instantiateWithWasi`, but takes the function returned by @rollup/plugin-wasm when a .wasm file is `import`ed by Javascript.
 * 
 * This exists just to remove simple boilerplate. You can easily re-implement if you need to fine-tune the behavior in some way.
 */
export async function instantiateFromRollupWithWasi<K extends keyof EntirePublicWasiInterface, L extends keyof EntirePublicEnvInterface>(wasmFetchPromise: RollupWasmPromise, unboundImports: EntirePublicInterface<K, L>) {
    return await instantiateGeneric(async (combinedImports) => await wasmFetchPromise(combinedImports), unboundImports);
}

export type RollupWasmPromise = (imports?: WebAssembly.Imports) => Promise<WebAssembly.WebAssemblyInstantiatedSource>;
