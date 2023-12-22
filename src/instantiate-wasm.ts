import { instantiateWasi } from "./instantiate-wasi.js";
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
export async function instantiateStreamingWithWasi<K extends keyof EntirePublicWasiInterface, L extends keyof EntirePublicEnvInterface>(wasm: Response | Promise<Response>, imports2: EntirePublicInterface<K, L>) {
    const { promise: wasmReady, resolve: resolveWasm } = promiseWithResolvers<WebAssembly.WebAssemblyInstantiatedSource>();

    // The wasiReady promise resolves immediately after the wasmReady promise resolves,
    // but it runs some initialization code so it's import to wait for it too.
    const { imports, wasiReady } = instantiateWasi<K, L>(wasmReady.then(s => { s.instance; return s; }), imports2);
    resolveWasm(await WebAssembly.instantiateStreaming(wasm, { ...imports }));
    return await wasiReady;
}

function promiseWithResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    let promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return {
        promise,
        resolve,
        reject
    }
}