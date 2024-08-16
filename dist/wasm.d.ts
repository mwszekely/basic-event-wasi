import type { EventTypesMap } from "./_private/event-types-map.js";
import { type KnownExports, type KnownImports } from "./types.js";
export type RollupWasmPromise<I extends KnownImports = KnownImports> = (imports?: I) => Promise<WebAssembly.WebAssemblyInstantiatedSource>;
interface InstantiatedWasmEventTarget extends EventTarget {
    addEventListener<K extends keyof EventTypesMap>(type: K, listener: (this: FileReader, ev: EventTypesMap[K]) => unknown, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void;
}
declare const EventTargetW: {
    new (): InstantiatedWasmEventTarget;
    prototype: InstantiatedWasmEventTarget;
};
/**
 * Extension of `WebAssembly.WebAssemblyInstantiatedSource` that is also an `EventTarget` for all WASI "event"s (which, yes, is why this is an entire `class`).
 */
export declare class InstantiatedWasm<Exports extends object = object, Embind extends object = object> extends EventTargetW implements WebAssembly.WebAssemblyInstantiatedSource {
    /** The `WebAssembly.Module` this instance was built from. Rarely useful by itself. */
    module: WebAssembly.Module;
    /** The `WebAssembly.Module` this instance was built from. Rarely useful by itself. */
    instance: WebAssembly.Instance;
    /**
     * Contains everything exported using embind.
     *
     * These are separate from regular exports on `instance.export`.
     */
    embind: Embind;
    /**
     * The "raw" WASM exports. None are prefixed with "_".
     *
     * No conversion is performed on the types here; everything takes or returns a number.
     *
     */
    exports: Exports & KnownExports;
    /**
     * `exports.memory`, but updated when/if more memory is allocated.
     *
     * Generally speaking, it's more convenient to use the general-purpose `readUint32` functions,
     * since they account for `DataView` being big-endian by default.
     */
    cachedMemoryView: DataView;
    /**
     * **IMPORTANT**: Until `initialize` is called, no WASM-related methods/fields can be used.
     *
     * `addEventListener` and other `EventTarget` methods are fine, though, and in fact are required for events that occur during `_initialize` or `_start`.
     *
     * If you don't care about events during initialization, you can also just call `InstantiatedWasm.instantiate`, which is an async function that does both in one step.
     */
    constructor();
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
    instantiate(wasmDataOrFetcher: RollupWasmPromise | WebAssembly.Module | BufferSource | Response | PromiseLike<Response>, { wasi_snapshot_preview1, env, ...unboundImports }: KnownImports): Promise<void>;
    static instantiate<Exports extends object = object, Embind extends object = object>(wasmDataOrFetcher: RollupWasmPromise | WebAssembly.Module | BufferSource | Response | PromiseLike<Response>, unboundImports: KnownImports, eventListeners?: Parameters<InstantiatedWasm<Exports, Embind>["addEventListener"]>[]): Promise<InstantiatedWasm<Exports, Embind>>;
}
export {};
//# sourceMappingURL=wasm.d.ts.map