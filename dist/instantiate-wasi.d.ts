import { EntirePublicEnvInterface, EntirePublicInterface, EntirePublicWasiInterface } from "./types.js";
type WebAssemblyInstantiatedSource = Awaited<ReturnType<(typeof WebAssembly)["instantiateStreaming"]>>;
/**
 * The WASI interface functions can't be used alone -- they need context like (what memory is this a pointer in) and such.
 *
 * This function provides that context to an import before it's passed to an `Instance` for construction.
 *
 * @remarks Intended usage:
 *
 * ```typescript
 * import { fd_write, proc_exit } from "whatever-this-lib-is-called"
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
 * @param base
 * @returns
 */
export declare function instantiateWasi<K extends keyof EntirePublicWasiInterface, L extends keyof EntirePublicEnvInterface>(wasmInstance: Promise<WebAssemblyInstantiatedSource>, base: EntirePublicInterface<K, L>, { dispatchEvent }?: {
    dispatchEvent?(event: Event): boolean;
}): {
    imports: {
        wasi_snapshot_preview1: Pick<EntirePublicWasiInterface, K>;
        env: Pick<EntirePublicEnvInterface, L>;
    };
    wasiReady: Promise<void>;
};
export {};
