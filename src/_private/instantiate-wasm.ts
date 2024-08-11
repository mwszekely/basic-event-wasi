import type { InstantiatedWasi } from "../instantiated-wasi.js";
import type { EntirePublicInterface } from "../types.js";
import { awaitAllEmbind } from "./embind/register.js";
import { instantiateWasi } from "./instantiate-wasi.js";

export type RollupWasmPromise<I extends EntirePublicInterface = EntirePublicInterface> = (imports?: I) => Promise<WebAssembly.WebAssemblyInstantiatedSource>;

export async function instantiateWasmGeneric<E extends {}, I extends EntirePublicInterface = EntirePublicInterface>(instantiateWasm: (boundImports: I) => Promise<WebAssembly.WebAssemblyInstantiatedSource>, unboundImports: I): Promise<InstantiatedWasi<E>> {

    // There's a bit of song and dance to get around the fact that:
    // 1. WASM needs its WASI imports immediately upon instantiation.
    // 2. WASI needs its WASM Instance immediately upon instantiation.
    // So we use promises to notify each that the other's been created.

    const { promise: wasmReady, resolve: resolveWasm } = Promise.withResolvers<WebAssembly.WebAssemblyInstantiatedSource>();
    const { imports, wasiReady } = instantiateWasi<E, I>(wasmReady, unboundImports);
    resolveWasm(await instantiateWasm({ ...imports }));
    const ret = await wasiReady;

    await awaitAllEmbind();

    return ret;
}
WebAssembly.instantiate