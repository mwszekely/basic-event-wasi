import { type RollupWasmPromise, instantiateWasmGeneric } from "./_private/instantiate-wasm.js";
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
export async function instantiate<E extends {}>(wasmFetchPromise: Response | PromiseLike<Response>, unboundImports: EntirePublicInterface): Promise<InstantiatedWasi<E>>;
export async function instantiate<E extends {}>(moduleBytes: WebAssembly.Module | BufferSource, unboundImports: EntirePublicInterface): Promise<InstantiatedWasi<E>>;
export async function instantiate<E extends {}>(wasmInstantiator: RollupWasmPromise, unboundImports: EntirePublicInterface): Promise<InstantiatedWasi<E>>;
export async function instantiate<E extends {}>(wasm: RollupWasmPromise | WebAssembly.Module | BufferSource | Response | PromiseLike<Response>, unboundImports: EntirePublicInterface): Promise<InstantiatedWasi<E>> {
    return await instantiateWasmGeneric<E>(async (combinedImports) => {
        if (wasm instanceof WebAssembly.Module)
            return ({ module: wasm, instance: await WebAssembly.instantiate(wasm, { ...combinedImports }) });
        else if (wasm instanceof ArrayBuffer || ArrayBuffer.isView(wasm))
            return await WebAssembly.instantiate(wasm, { ...combinedImports });
        else if ("then" in wasm || ("Response" in globalThis && wasm instanceof Response))
            return await WebAssembly.instantiateStreaming(wasm, { ...combinedImports });
        else
            return await (wasm as RollupWasmPromise)(combinedImports);

    }, unboundImports)
}


