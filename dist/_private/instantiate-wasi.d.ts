import { InstantiatedWasi } from "../instantiated-wasi.js";
import type { EntirePublicInterface } from "../types.js";
export interface WasiReturn<E extends {}, I extends EntirePublicInterface> {
    imports: I;
    wasiReady: Promise<InstantiatedWasi<E>>;
}
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
export declare function instantiateWasi<E extends {}, I extends EntirePublicInterface>(wasmInstance: Promise<WebAssembly.WebAssemblyInstantiatedSource>, unboundImports: I, { dispatchEvent }?: {
    dispatchEvent?(event: Event): boolean;
}): WasiReturn<E, I>;
//# sourceMappingURL=instantiate-wasi.d.ts.map