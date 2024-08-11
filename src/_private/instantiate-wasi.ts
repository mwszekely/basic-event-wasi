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
export function instantiateWasi<E extends {}, I extends EntirePublicInterface>(wasmInstance: Promise<WebAssembly.WebAssemblyInstantiatedSource>, unboundImports: I, { dispatchEvent }: { dispatchEvent?(event: Event): boolean } = {}): WasiReturn<E, I> {
    let resolve!: (value: InstantiatedWasi<E>) => void;
    let ret = new InstantiatedWasi<E>();
    wasmInstance.then((o) => {
        const { instance, module } = o;

        // Needs to come before _initialize() or _start().
        (ret as any)._init(module, instance);

        console.assert(("_initialize" in instance.exports) != "_start" in instance.exports, `Expected either _initialize XOR _start to be exported from this WASM.`);
        if ("_initialize" in instance.exports) {
            (instance.exports as any)._initialize();
        }
        else if ("_start" in instance.exports) {
            (instance.exports as any)._start();
        }
        resolve(ret);
    });

    // All the functions we've been passed were imported and haven't been bound yet.
    // Return a new object with each member bound to the private information we pass around.

    const wasi_snapshot_preview1 = bindAllFuncs(ret, unboundImports.wasi_snapshot_preview1);
    const env = bindAllFuncs(ret, unboundImports.env);

    const boundImports = { wasi_snapshot_preview1, env } as I;
    return {
        imports: boundImports,
        // Until this resolves, no WASI functions can be called (and by extension no wasm exports can be called)
        // It resolves immediately after the input promise to the instance&module resolves
        wasiReady: new Promise<InstantiatedWasi<E>>((res) => { resolve! = res })
    };
}


// Given an object, binds each function in that object to p (shallowly).
function bindAllFuncs<R extends {}>(p: InstantiatedWasi<{}>, r: R): R {
    return Object.fromEntries(Object.entries(r).map(([key, func]) => { return [key, (typeof func == "function" ? func.bind(p) : func)] as const; })) as R;
}
