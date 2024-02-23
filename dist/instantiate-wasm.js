import { instantiateWasi } from "./instantiate-wasi.js";
async function instantiateGeneric(instantiateWasm, unboundImports) {
    // There's a bit of song and dance to get around the fact that:
    // 1. WASM needs its WASI imports immediately upon instantiation.
    // 2. WASI needs its WASM Instance immediately upon instantiation.
    // So we use promises to notify each that the other's been created.
    const { promise: wasmReady, resolve: resolveWasm } = Promise.withResolvers();
    const { imports, wasiReady } = instantiateWasi(wasmReady, unboundImports);
    resolveWasm(await instantiateWasm({ ...imports }));
    return await wasiReady;
}
/**
 * Like `WebAssembly.instantiateStreaming`, but also instantiates WASI with the `imports` you pass in.
 *
 * This exists just to remove simple boilerplate. You can easily re-implement if you need to fine-tune the behavior in some way.
 */
export async function instantiateStreamingWithWasi(response, unboundImports) {
    return await instantiateGeneric(async (combinedImports) => {
        debugger;
        let ret = WebAssembly.instantiateStreaming(response, { ...combinedImports });
        let ret2 = await ret;
        return ret2;
    }, unboundImports);
}
/**
 * Like `WebAssembly.instantiate`, but also instantiates WASI with the `imports` you pass in.
 *
 * This exists just to remove simple boilerplate. You can easily re-implement if you need to fine-tune the behavior in some way.
 */
export async function instantiateWithWasi(module, unboundImports) {
    return await instantiateGeneric(async (combinedImports) => ({ module, instance: await WebAssembly.instantiate(module, { ...combinedImports }) }), unboundImports);
}
/**
 * Like `instantiateWithWasi`, but takes the function returned by @rollup/plugin-wasm when a .wasm file is `import`ed by Javascript.
 *
 * This exists just to remove simple boilerplate. You can easily re-implement if you need to fine-tune the behavior in some way.
 */
export async function instantiateFromRollupWithWasi(wasmFetchPromise, unboundImports) {
    return await instantiateGeneric(async (combinedImports) => await wasmFetchPromise(combinedImports), unboundImports);
}
