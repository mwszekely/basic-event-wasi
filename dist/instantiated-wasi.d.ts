import { EmboundTypes } from "./_private/embind/types.js";
import type { EventTypesMap } from "./_private/event-types-map.js";
import { KnownInstanceExports2 } from "./types.js";
interface InstantiatedWasiEventTarget extends EventTarget {
    addEventListener<K extends keyof EventTypesMap>(type: K, listener: (this: FileReader, ev: EventTypesMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void;
}
declare const InstantiatedWasiEventTarget: {
    new (): InstantiatedWasiEventTarget;
    prototype: InstantiatedWasiEventTarget;
};
/**
 * Extension of `WebAssembly.WebAssemblyInstantiatedSource` that is also an `EventTarget` for all WASI "event"s.
 */
export declare class InstantiatedWasi<E extends {}> extends InstantiatedWasiEventTarget implements WebAssembly.WebAssemblyInstantiatedSource {
    /** The `WebAssembly.Module` this instance was built from. Rarely useful by itself. */
    module: WebAssembly.Module;
    /** The `WebAssembly.Module` this instance was built from. Rarely useful by itself. */
    instance: WebAssembly.Instance;
    /**
     * Contains everything exported using embind.
     *
     * These are separate from regular exports on `instance.export`.
     */
    embind: EmboundTypes;
    /**
     * The "raw" WASM exports. None are prefixed with "_".
     *
     * No conversion is performed on the types here; everything takes or returns a number.
     *
     */
    exports: E & KnownInstanceExports2;
    cachedMemoryView: DataView;
    /** Not intended to be called directly. Use the `instantiate` function instead, which returns one of these. */
    constructor();
    private _init;
}
export {};
//# sourceMappingURL=instantiated-wasi.d.ts.map