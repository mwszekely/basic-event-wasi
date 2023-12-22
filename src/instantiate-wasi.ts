import type { EntirePublicEnvInterface, EntirePublicInterface, EntirePublicWasiInterface, PrivateImpl } from "./types.js";

const wasi = Symbol("wasi-impl");

/**
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
 * @param base 
 * @returns 
 */
export function instantiateWasi<K extends keyof EntirePublicWasiInterface, L extends keyof EntirePublicEnvInterface>(wasmInstance: Promise<WebAssembly.WebAssemblyInstantiatedSource>, base: EntirePublicInterface<K, L>, { dispatchEvent }: { dispatchEvent?(event: Event): boolean } = {}) {
    if (!dispatchEvent && !("dispatchEvent" in globalThis)) {
        console.warn(`globalThis.dispatchEvent does not exist here -- events from WebAssembly will go unhandled.`);
    }

    dispatchEvent ??= function dispatchEvent(event) {
        if ("dispatchEvent" in globalThis) {
            return globalThis.dispatchEvent(event);
        }
        else {
            console.warn(`Unhandled event: ${event}`);
            return false;
        }
    };

    let resolve!: (value: WebAssembly.WebAssemblyInstantiatedSource) => void;
    const p: PrivateImpl<K> = {
        instance: null!,
        module: null!,
        wasiSubset: base,
        cachedMemoryView: null,
        dispatchEvent(e) { return dispatchEvent!(e); }
    }
    wasmInstance.then((obj) => {
        const { instance, module } = obj;
        p.instance = instance;
        p.module = module;
        (instance as any)[wasi] = p;
        p.cachedMemoryView = new DataView((instance.exports.memory as WebAssembly.Memory).buffer);
        console.assert(("_initialize" in p.instance.exports) != "_start" in p.instance.exports);
        if ("_initialize" in p.instance.exports) {
            (p.instance.exports as any)._initialize();
        }
        else if ("_start" in p.instance.exports) {
            (p.instance.exports as any)._start();
        }
        resolve(obj);
    });

    // All the functions we've been passed were imported and haven't been bound yet.
    // Return a new object with each member bound to the private information we pass around.
    const wasi_snapshot_preview1 = Object.fromEntries(Object.entries(base.wasi_snapshot_preview1).map(([key, func]) => { return [key, (func as Function).bind(p)] as const; })) as Pick<EntirePublicWasiInterface, K>;
    const env = Object.fromEntries(Object.entries(base.env).map(([key, func]) => { return [key, (func as Function).bind(p)] as const; })) as Pick<EntirePublicEnvInterface, L>;

    return {
        imports: { wasi_snapshot_preview1, env },
        // Until this resolves, no WASI functions can be called (and by extension no w'asm exports can be called)
        // It resolves immediately after the input promise to the instance&module resolves
        wasiReady: new Promise<WebAssembly.WebAssemblyInstantiatedSource>((res) => { resolve! = res })
    };
}

export function getImpl(instance: WebAssembly.Instance) {
    return (instance as any)[wasi] as PrivateImpl;
}

