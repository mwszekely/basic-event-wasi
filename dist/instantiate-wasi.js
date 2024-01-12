const wasi = Symbol("wasi-impl");
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
export function instantiateWasi(wasmInstance, unboundImports, { dispatchEvent } = {}) {
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
    let resolve;
    const p = {
        instance: null,
        module: null,
        //wasiSubset: unboundImports,
        cachedMemoryView: null,
        dispatchEvent(e) { return dispatchEvent(e); }
    };
    wasmInstance.then((obj) => {
        const { instance, module } = obj;
        p.instance = instance;
        p.module = module;
        instance[wasi] = p;
        p.cachedMemoryView = new DataView(instance.exports.memory.buffer);
        console.assert(("_initialize" in p.instance.exports) != "_start" in p.instance.exports);
        if ("_initialize" in p.instance.exports) {
            p.instance.exports._initialize();
        }
        else if ("_start" in p.instance.exports) {
            p.instance.exports._start();
        }
        resolve(obj);
    });
    // All the functions we've been passed were imported and haven't been bound yet.
    // Return a new object with each member bound to the private information we pass around.
    const wasi_snapshot_preview1 = bindAllFuncs(p, unboundImports.wasi_snapshot_preview1);
    const env = bindAllFuncs(p, unboundImports.env);
    const boundImports = { wasi_snapshot_preview1, env };
    return {
        imports: boundImports,
        // Until this resolves, no WASI functions can be called (and by extension no w'asm exports can be called)
        // It resolves immediately after the input promise to the instance&module resolves
        wasiReady: new Promise((res) => { resolve = res; })
    };
}
export function getImpl(instance) {
    return instance[wasi];
}
// Given an object, binds each function in that object to p (shallowly).
function bindAllFuncs(p, r) {
    return Object.fromEntries(Object.entries(r).map(([key, func]) => { return [key, (typeof func == "function" ? func.bind(p) : func)]; }));
}
