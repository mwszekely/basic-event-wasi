import { EntirePublicEnvInterface, EntirePublicInterface, EntirePublicWasiInterface, PrivateImpl } from "./types.js";

type WebAssemblyInstantiatedSource = Awaited<ReturnType<(typeof WebAssembly)["instantiateStreaming"]>>

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
export function instantiateWasi<K extends keyof EntirePublicWasiInterface, L extends keyof EntirePublicEnvInterface>(wasmInstance: Promise<WebAssemblyInstantiatedSource>, base: EntirePublicInterface<K, L>, { dispatchEvent }: { dispatchEvent?(event: Event): boolean } = {}) {
    dispatchEvent ??= function dispatchEvent(event) {
        if ("dispatchEvent" in globalThis) {
            return globalThis.dispatchEvent(event);
        }
        else {
            console.warn(`Unhandled event: ${event}`);
            return false;
        }
    };

    let resolve!: () => void;
    const p: PrivateImpl<K> = {
        instance: null!,
        module: null!,
        wasiSubset: base,
        getMemory() { return new DataView((p.instance.exports.memory as WebAssembly.Memory).buffer); },

        // wasm is little endian by default, and DataView is big endian by default.............
        readUint64(ptr) { return p.getMemory().getBigUint64(ptr, true); },
        readInt64(ptr) { return p.getMemory().getBigInt64(ptr, true); },
        readUint32(ptr) { return p.getMemory().getUint32(ptr, true); },
        readInt32(ptr) { return p.getMemory().getInt32(ptr, true); },
        readUint16(ptr) { return p.getMemory().getUint16(ptr, true); },
        readInt16(ptr) { return p.getMemory().getInt16(ptr, true); },
        readUint8(ptr) { return p.getMemory().getUint8(ptr); },
        readInt8(ptr) { return p.getMemory().getInt8(ptr); },

        writeUint64(ptr, value) { return p.getMemory().setBigUint64(ptr, value, true); },
        writeInt64(ptr, value) { return p.getMemory().setBigInt64(ptr, value, true); },
        writeUint32(ptr, value) { return p.getMemory().setUint32(ptr, value, true); },
        writeInt32(ptr, value) { return p.getMemory().setInt32(ptr, value, true); },
        writeUint16(ptr, value) { return p.getMemory().setUint16(ptr, value, true); },
        writeInt16(ptr, value) { return p.getMemory().setInt16(ptr, value, true); },
        writeUint8(ptr, value) { return p.getMemory().setUint8(ptr, value); },
        writeInt8(ptr, value) { return p.getMemory().setInt8(ptr, value); },

        // TODO on both of these
        readPointer(ptr) { return p.getMemory().getUint32(ptr, true); },
        getPointerSize() { return 4; },

        dispatchEvent(e) { return dispatchEvent!(e); }
    }
    wasmInstance.then(({ instance, module }) => {
        p.instance = instance;
        p.module = module;
        debugger;
        console.assert(("_initialize" in p.instance.exports) != "_start" in p.instance.exports);
        if ("_initialize" in p.instance.exports) {
            (p.instance.exports as any)._initialize();
        }
        else if ("_start" in p.instance.exports) {
            (p.instance.exports as any)._start();
        }
        resolve();
    });

    // All the functions we've been passed were imported and haven't been bound yet.
    // Return a new object with each member bound to the private information we pass around.
    const wasi_snapshot_preview1 = Object.fromEntries(Object.entries(base.wasi_snapshot_preview1).map(([key, func]) => { return [key, (func as Function).bind(p)] as const; })) as Pick<EntirePublicWasiInterface, K>;
    const env = Object.fromEntries(Object.entries(base.env).map(([key, func]) => { return [key, (func as Function).bind(p)] as const; })) as Pick<EntirePublicEnvInterface, L>;

    return {
        imports: { wasi_snapshot_preview1, env },
        // Until this resolves, no WASI functions can be called (and by extension no w'asm exports can be called)
        // It resolves immediately after the input promise to the instance&module resolves
        wasiReady: new Promise<void>((res) => { resolve! = res })
    };
}
