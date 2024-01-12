import type { EntirePublicEnvInterface, EntirePublicInterface, EntirePublicWasiInterface, PrivateImpl } from "./types.js";
/**
 * Instantiate the WASI interface, binding all its functions to the WASM instance itself.
 *
 * Must be used in conjunction with, e.g., `WebAssembly.instantiate`. Because that and this both require each other circularly,
 * `instantiateStreamingWithWasi` and `instantiateWithWasi` are convenience functions that do both at once.
 *
 * The WASI interface functions can't be used alone -- they need context like (what memory is this a pointer in) and such.
 *
 * This function provides that context to an import before it's passed to an `Instance` for construction.
 *
 * @remarks Intended usage:
 *
 * ```typescript
 * import { fd_write, proc_exit } from "basic-event-wasi"
 * // Waiting for https://github.com/tc39/proposal-promise-with-resolvers...
 * let resolve: (info: WebAssemblyInstantiatedSource) => void;
 * let reject: (error: any) => void;
 * let promise = new Promise<WebAssemblyInstantiatedSource>((res, rej) => {
 *     resolve = res;
 *     reject = rej;
 * });
 *
 * WebAssembly.instantiateStreaming(source, { ...makeWasiInterface(promise.then(s => s.instance), { fd_write, proc_exit }) });
 * ```
 * ([Please please please please please](https://github.com/tc39/proposal-promise-with-resolvers))
 *
 * @param wasmInstance
 * @param unboundImports
 * @returns
 */
export declare function instantiateWasi<K extends keyof EntirePublicWasiInterface, L extends keyof EntirePublicEnvInterface>(wasmInstance: Promise<WebAssembly.WebAssemblyInstantiatedSource>, unboundImports: EntirePublicInterface<K, L>, { dispatchEvent }?: {
    dispatchEvent?(event: Event): boolean;
}): WasiReturn<K, L>;
export interface WasiReturnImports<K extends keyof EntirePublicWasiInterface, L extends keyof EntirePublicEnvInterface> {
    wasi_snapshot_preview1: Pick<EntirePublicWasiInterface, K>;
    env: Pick<EntirePublicEnvInterface, L>;
}
export interface WasiReturn<K extends keyof EntirePublicWasiInterface, L extends keyof EntirePublicEnvInterface> {
    imports: WasiReturnImports<K, L>;
    wasiReady: Promise<WebAssembly.WebAssemblyInstantiatedSource>;
}
export declare function getImpl(instance: WebAssembly.Instance): PrivateImpl;
