import { awaitAllEmbind } from "./_private/embind/register.js";
import type { EventTypesMap } from "./_private/event-types-map.js";
import { type KnownExports, type KnownImports } from "./types.js";


export type RollupWasmPromise<I extends KnownImports = KnownImports> = (imports?: I) => Promise<WebAssembly.WebAssemblyInstantiatedSource>;



interface InstantiatedWasmEventTarget extends EventTarget {
    addEventListener<K extends keyof EventTypesMap>(type: K, listener: (this: FileReader, ev: EventTypesMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void;
}


//  This reassignment is a Typescript hack to add custom types to addEventListener...
const EventTargetW = EventTarget as { new(): InstantiatedWasmEventTarget; prototype: InstantiatedWasmEventTarget };

/**
 * Extension of `WebAssembly.WebAssemblyInstantiatedSource` that is also an `EventTarget` for all WASI "event"s (which, yes, is why this is an entire `class`).
 */
export class InstantiatedWasm<Exports extends {} = {}, Embind extends {} = {}> extends EventTargetW implements WebAssembly.WebAssemblyInstantiatedSource {
    /** The `WebAssembly.Module` this instance was built from. Rarely useful by itself. */
    public module: WebAssembly.Module;

    /** The `WebAssembly.Module` this instance was built from. Rarely useful by itself. */
    public instance: WebAssembly.Instance;

    /**
     * Contains everything exported using embind.
     * 
     * These are separate from regular exports on `instance.export`.
     */
    public embind: Embind;

    /** 
     * The "raw" WASM exports. None are prefixed with "_".
     * 
     * No conversion is performed on the types here; everything takes or returns a number.
     * 
     */
    public exports: Exports & KnownExports;

    /**
     * `exports.memory`, but updated when/if more memory is allocated.
     * 
     * Generally speaking, it's more convenient to use the general-purpose `readUint32` functions,
     * since they account for `DataView` being big-endian by default.
     */
    public cachedMemoryView: DataView;

    /** 
     * Not intended to be called directly. Use the static `instantiate` function instead, which returns one of these.
     * 
     * I want to instead just return a promise here sooooooo badly...
     */
    private constructor() {
        super();
        this.module = this.instance = this.exports = this.cachedMemoryView = null!
        this.embind = {} as never;
    }


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
    static async instantiate<Exports extends {}, Embind extends {}>(wasmFetchPromise: Response | PromiseLike<Response>, unboundImports: KnownImports): Promise<InstantiatedWasm<Exports, Embind>>;
    static async instantiate<Exports extends {}, Embind extends {}>(moduleBytes: WebAssembly.Module | BufferSource, unboundImports: KnownImports): Promise<InstantiatedWasm<Exports, Embind>>;
    static async instantiate<Exports extends {}, Embind extends {}>(wasmInstantiator: RollupWasmPromise, unboundImports: KnownImports): Promise<InstantiatedWasm<Exports, Embind>>;
    static async instantiate<Exports extends {}, Embind extends {}>(wasmDataOrFetcher: RollupWasmPromise | WebAssembly.Module | BufferSource | Response | PromiseLike<Response>, { wasi_snapshot_preview1, env, ...unboundImports }: KnownImports): Promise<InstantiatedWasm<Exports, Embind>> {
        // (These are just up here to not get in the way of the comments)
        let wasm: InstantiatedWasm<Exports, Embind>;
        let module: WebAssembly.Module;
        let instance: WebAssembly.Instance;


        // There's a bit of song and dance to get around the fact that:
        // 1. WASM needs its WASI imports immediately upon instantiation.
        // 2. WASI needs its WASM `Instance` in order to function.

        // First, bind all of our imports to the same object, 
        // which also happens to be the InstantiatedWasm we're returning (but could theoretically be something else).
        // This is how they'll be able to access memory and communicate with each other.
        wasm = new InstantiatedWasm<Exports, Embind>();
        const imports = {
            wasi_snapshot_preview1: bindAllFuncs(wasm, wasi_snapshot_preview1),
            env: bindAllFuncs(wasm, env),
            ...unboundImports
        } as KnownImports & WebAssembly.Imports;

        // We have those imports, and they've been bound to the to-be-instantiated WASM.
        // Now pass those bound imports to WebAssembly.instantiate (or whatever the user specified)
        if (wasmDataOrFetcher instanceof WebAssembly.Module) {
            instance = await WebAssembly.instantiate(wasmDataOrFetcher, imports)
            module = wasmDataOrFetcher;
        }
        else if (wasmDataOrFetcher instanceof ArrayBuffer || ArrayBuffer.isView(wasmDataOrFetcher))
            ({ instance, module } = await WebAssembly.instantiate(wasmDataOrFetcher, imports));
        else if (isResponse(wasmDataOrFetcher))
            ({ instance, module } = await WebAssembly.instantiateStreaming(wasmDataOrFetcher, imports));

        else
            ({ instance, module } = await wasmDataOrFetcher(imports));


        // Do the stuff we couldn't do in the `InstantiatedWasm` constructor because we didn't have these then:
        wasm.instance = instance;
        wasm.module = module;
        wasm.exports = wasm.instance.exports as Exports as Exports & KnownExports;
        wasm.cachedMemoryView = new DataView(wasm.exports.memory.buffer);

        // Almost done -- now run WASI's `_start` or `_initialize` function.
        console.assert(("_initialize" in wasm.instance.exports) != "_start" in wasm.instance.exports, `Expected either _initialize XOR _start to be exported from this WASM.`);
        if ("_initialize" in wasm.instance.exports)
            (wasm.instance.exports as any)._initialize();
        else if ("_start" in wasm.instance.exports)
            (wasm.instance.exports as any)._start();

        // Wait for all Embind calls to resolve (they `await` each other based on the dependencies they need, and this resolves when all dependencies have too)
        await awaitAllEmbind();

        // And we're finally finished.
        return wasm;
    }
}

// Given an object, binds each function in that object to p (shallowly).
function bindAllFuncs<R extends {}>(p: InstantiatedWasm, r: R): R {
    return Object.fromEntries(Object.entries(r).map(([key, func]) => { return [key, (typeof func == "function" ? func.bind(p) : func)] as const; })) as R;
}

// Separated out for type reasons due to "Response" not existing in limited Worklet-like environments.
function isResponse(arg: any): arg is Response | PromiseLike<Response> { return "then" in arg || ("Response" in globalThis && arg instanceof Response); }

